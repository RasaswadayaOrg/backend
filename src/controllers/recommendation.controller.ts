import { Response } from 'express';
import { prisma } from '../lib/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { buildPreferenceProfile, normaliseToken, type PreferenceProfile } from '../lib/culturalPreferences';

const AI_API_URL = process.env.AI_API_URL || 'http://localhost:8000';

type RecommendationType = 'ARTIST' | 'EVENT';

type RecommendationCandidate = {
  recommendedId: string;
  recommendedType: RecommendationType;
  score: number;
  reason: string;
  layer?: string;
};

const artistSelect = {
  id: true,
  name: true,
  profession: true,
  genre: true,
  photoUrl: true,
  location: true,
};

const eventSelect = {
  id: true,
  title: true,
  category: true,
  imageUrl: true,
  eventDate: true,
  description: true,
  city: true,
  location: true,
  venue: true,
};

const normalise = normaliseToken;

const parseAiRecommendations = (payload: any): RecommendationCandidate[] => {
  const nested = payload?.recommendations;
  const flatItems = Array.isArray(nested) ? nested : [];
  const artistItems = flatItems.length === 0
    ? Array.isArray(nested?.artists)
      ? nested.artists
      : Array.isArray(payload?.grouped?.artists)
        ? payload.grouped.artists
        : []
    : [];
  const eventItems = flatItems.length === 0
    ? Array.isArray(nested?.events)
      ? nested.events
      : Array.isArray(payload?.grouped?.events)
        ? payload.grouped.events
        : []
    : [];
  const topLevelArtistItems = flatItems.length === 0 && artistItems.length === 0 && Array.isArray(payload?.artists)
    ? payload.artists
    : [];
  const topLevelEventItems = flatItems.length === 0 && eventItems.length === 0 && Array.isArray(payload?.events)
    ? payload.events
    : [];

  const candidates: RecommendationCandidate[] = [];

  for (const rec of flatItems) {
    const type = String(rec.type || rec.recommendedType || '').toUpperCase();
    const id = rec.recommendedId || rec.artist_id || rec.artistId || rec.event_id || rec.eventId || rec.id;
    if ((type === 'ARTIST' || type === 'EVENT') && id) {
      candidates.push({
        recommendedId: id,
        recommendedType: type,
        score: Number(rec.score ?? rec.match_score ?? 0),
        reason: rec.reason || 'AI real-time match',
        layer: rec.layer,
      });
    }
  }

  for (const rec of [...artistItems, ...topLevelArtistItems]) {
    const id = rec.artist_id || rec.artistId || rec.recommendedId || rec.id;
    if (id) {
      candidates.push({
        recommendedId: id,
        recommendedType: 'ARTIST',
        score: Number(rec.score ?? rec.match_score ?? 0),
        reason: rec.reason || 'AI real-time artist match',
        layer: rec.layer,
      });
    }
  }

  for (const rec of [...eventItems, ...topLevelEventItems]) {
    const id = rec.event_id || rec.eventId || rec.recommendedId || rec.id;
    if (id) {
      candidates.push({
        recommendedId: id,
        recommendedType: 'EVENT',
        score: Number(rec.score ?? rec.match_score ?? 0),
        reason: rec.reason || 'AI real-time event match',
        layer: rec.layer,
      });
    }
  }

  return candidates
    .filter((rec) => rec.recommendedId && Number.isFinite(rec.score))
    .sort((a, b) => b.score - a.score);
};

const hydrateRecommendations = async (recommendations: RecommendationCandidate[]) => {
  const artistIds = recommendations
    .filter((rec) => rec.recommendedType === 'ARTIST')
    .map((rec) => rec.recommendedId);
  const eventIds = recommendations
    .filter((rec) => rec.recommendedType === 'EVENT')
    .map((rec) => rec.recommendedId);

  const [artists, events] = await Promise.all([
    artistIds.length > 0
      ? prisma.artist.findMany({ where: { id: { in: artistIds } }, select: artistSelect })
      : Promise.resolve([]),
    eventIds.length > 0
      ? prisma.event.findMany({ where: { id: { in: eventIds } }, select: eventSelect })
      : Promise.resolve([]),
  ]);

  const artistMap = new Map(artists.map((artist) => [artist.id, artist]));
  const eventMap = new Map(events.map((event) => [event.id, event]));

  return recommendations
    .map((rec) => {
      const item = rec.recommendedType === 'ARTIST'
        ? artistMap.get(rec.recommendedId)
        : eventMap.get(rec.recommendedId);
      if (!item) {
        return null;
      }
      return {
        recommendedId: rec.recommendedId,
        recommendedType: rec.recommendedType,
        score: rec.score,
        reason: rec.reason,
        layer: rec.layer,
        item,
        type: rec.recommendedType.toLowerCase(),
      };
    })
    .filter(Boolean);
};

const getUserPreferenceProfile = async (userId: string) => {
  const [user, preference] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { city: true } }),
    prisma.userPreference.findUnique({ where: { userId } }),
  ]);

  return buildPreferenceProfile({
    city: user?.city,
    categories: preference?.categories || [],
    interests: preference?.interests || [],
  });
};

const scoreTermMatch = (profile: PreferenceProfile, values: Array<string | null | undefined>) => {
  let score = 0;
  const matchedTerms = new Set<string>();

  for (const value of values) {
    const normalised = normalise(value);
    if (!normalised) {
      continue;
    }
    const valueParts = new Set([normalised, ...normalised.split('_').filter((part) => part.length > 2)]);
    for (const term of profile.matchTerms) {
      if (matchedTerms.has(term)) {
        continue;
      }
      if (normalised === term || normalised.includes(term) || term.includes(normalised) || valueParts.has(term)) {
        score += normalised === term || valueParts.has(term) ? 0.16 : 0.1;
        matchedTerms.add(term);
      }
    }
  }
  return Math.min(score, 0.5);
};

const scoreCityMatch = (profile: PreferenceProfile, values: Array<string | null | undefined>, weight: number) => {
  if (!profile.city) {
    return 0;
  }

  return values.some((value) => {
    const normalised = normalise(value);
    return normalised && (normalised === profile.city || normalised.includes(profile.city!) || profile.city!.includes(normalised));
  }) ? weight : 0;
};

const scoreHydratedRecommendation = (profile: PreferenceProfile, rec: any) => {
  if (!profile.hasSignals || !rec?.item) {
    return 0;
  }

  if (rec.recommendedType === 'ARTIST') {
    return Math.min(
      0.42,
      scoreTermMatch(profile, [rec.item.genre, rec.item.profession, rec.item.name, rec.item.location])
      + scoreCityMatch(profile, [rec.item.location], 0.08)
    );
  }

  return Math.min(
    0.48,
    scoreTermMatch(profile, [rec.item.category, rec.item.title, rec.item.city, rec.item.location, rec.item.venue, rec.item.description])
    + scoreCityMatch(profile, [rec.item.city, rec.item.location, rec.item.venue], 0.18)
  );
};

const personaliseHydratedRecommendations = (recommendations: any[], profile: PreferenceProfile) => recommendations
  .map((rec) => {
    const preferenceBoost = scoreHydratedRecommendation(profile, rec);
    return {
      ...rec,
      score: Math.min(0.99, Number(rec.score || 0) + preferenceBoost),
      preferenceBoost,
    };
  })
  .sort((a, b) => b.score - a.score);

const mergeHydratedRecommendations = (primary: any[], secondary: any[]) => {
  const merged = new Map<string, any>();
  for (const rec of [...primary, ...secondary]) {
    if (!rec?.recommendedId || !rec?.recommendedType) {
      continue;
    }
    const key = `${rec.recommendedType}:${rec.recommendedId}`;
    const existing = merged.get(key);
    if (!existing || Number(rec.score || 0) > Number(existing.score || 0)) {
      merged.set(key, rec);
    }
  }
  return Array.from(merged.values());
};

const getContentBasedFallback = async (profile: PreferenceProfile): Promise<RecommendationCandidate[]> => {
  const [artists, events] = await Promise.all([
    prisma.artist.findMany({ select: { ...artistSelect, location: true }, take: 100, orderBy: { updatedAt: 'desc' } }),
    prisma.event.findMany({
      where: { eventDate: { gte: new Date() } },
      select: { ...eventSelect, city: true, location: true },
      take: 100,
      orderBy: { eventDate: 'asc' },
    }),
  ]);

  const reasonTarget = profile.topInterestLabel !== 'Not selected'
    ? profile.topInterestLabel
    : profile.topCategoryLabel !== 'Not selected'
      ? profile.topCategoryLabel
      : profile.cityLabel || 'location';

  const artistCandidates = artists.map((artist) => {
    const score = Math.min(
      0.99,
      0.38
      + scoreTermMatch(profile, [artist.genre, artist.profession, artist.name, artist.location])
      + scoreCityMatch(profile, [artist.location], 0.06)
    );
    return {
      recommendedId: artist.id,
      recommendedType: 'ARTIST' as RecommendationType,
      score,
      reason: profile.hasSignals ? `Matched to your ${reasonTarget} preference` : 'Popular cultural artist',
    };
  });

  const eventCandidates = events.map((event) => {
    const score = Math.min(
      0.99,
      0.36
      + scoreTermMatch(profile, [event.category, event.title, event.city, event.location, event.venue, event.description])
      + scoreCityMatch(profile, [event.city, event.location, event.venue], 0.18)
    );
    return {
      recommendedId: event.id,
      recommendedType: 'EVENT' as RecommendationType,
      score,
      reason: profile.hasSignals ? `Matched to your ${reasonTarget} preference and location` : 'Upcoming cultural event',
    };
  });

  const rankedArtists = artistCandidates.sort((a, b) => b.score - a.score).slice(0, 6);
  const rankedEvents = eventCandidates.sort((a, b) => b.score - a.score).slice(0, 6);

  return [...rankedEvents, ...rankedArtists]
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
};

const cacheRecommendations = async (userId: string, recommendations: RecommendationCandidate[]) => {
  if (recommendations.length === 0) {
    return;
  }

  await prisma.recommendation.deleteMany({ where: { userId } });
  await prisma.recommendation.createMany({
    data: recommendations.map((rec) => ({
      userId,
      recommendedType: rec.recommendedType,
      recommendedId: rec.recommendedId,
      score: rec.score,
      reason: rec.reason,
    })),
  });
};

export const getUserRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const preferenceProfile = await getUserPreferenceProfile(userId);

    let populatedRecommendations: any[] = [];
    let source = 'empty';

    try {
      let aiResponse = await fetch(`${AI_API_URL}/recommend/${userId}`);
      
      if (aiResponse.status === 404) {
        console.log('User not found in AI graph. Triggering AI model DB sync...');
        const refreshResponse = await fetch(`${AI_API_URL}/refresh`, { method: 'POST' });
        if (refreshResponse.ok) {
          aiResponse = await fetch(`${AI_API_URL}/recommend/${userId}`);
        } else {
          console.warn(`AI refresh failed with status ${refreshResponse.status}`);
        }
      }

      if (aiResponse.ok) {
        let liveData = await aiResponse.json() as any;
        if (liveData.new_user && Array.isArray(liveData.artists) && liveData.artists.length === 0) {
          console.log(`[RECS] New user ${userId} returned empty recs - triggering graph refresh`);
          const refreshResponse = await fetch(`${AI_API_URL}/refresh`, { method: 'POST' });
          if (refreshResponse.ok) {
            aiResponse = await fetch(`${AI_API_URL}/recommend/${userId}`);
            if (aiResponse.ok) {
              liveData = await aiResponse.json() as any;
            }
          }
        }
        const liveRecommendations = parseAiRecommendations(liveData);
        populatedRecommendations = await hydrateRecommendations(liveRecommendations);
        if (liveRecommendations.length > 0 && populatedRecommendations.length === 0) {
          console.log(`[RECS] AI returned unhydrated IDs for ${userId}; refreshing graph from DB and retrying`);
          const refreshResponse = await fetch(`${AI_API_URL}/refresh`, { method: 'POST' });
          if (refreshResponse.ok) {
            const retryResponse = await fetch(`${AI_API_URL}/recommend/${userId}`);
            if (retryResponse.ok) {
              const retryData = await retryResponse.json() as any;
              const retryRecommendations = parseAiRecommendations(retryData);
              populatedRecommendations = await hydrateRecommendations(retryRecommendations);
            }
          }
        }
        if (populatedRecommendations.length > 0) {
          source = 'ai';
        }

        try {
          await cacheRecommendations(
            userId,
            populatedRecommendations.map((rec) => ({
              recommendedId: rec.recommendedId,
              recommendedType: rec.recommendedType,
              score: rec.score,
              reason: rec.reason,
              layer: rec.layer,
            }))
          );
        } catch (dbError) {
          console.error('Failed to sync live recommendations to memory:', dbError);
        }
      }
    } catch (aiError) {
      console.log('Real-time AI API unreachable, falling back to DB recommendations...');
    }

    if (populatedRecommendations.length === 0) {
      const recommendations = await prisma.recommendation.findMany({
        where: { 
          userId: userId
        },
        orderBy: {
          score: 'desc'
        },
        take: 6
      });

      populatedRecommendations = await hydrateRecommendations(
        recommendations.map((rec) => ({
          recommendedId: rec.recommendedId,
          recommendedType: rec.recommendedType as RecommendationType,
          score: rec.score,
          reason: rec.reason || 'Cached recommendation',
        }))
      );
      if (populatedRecommendations.length > 0) {
        source = 'cache';
      }
    }

    if (populatedRecommendations.length === 0) {
      const contentFallback = await getContentBasedFallback(preferenceProfile);
      populatedRecommendations = await hydrateRecommendations(contentFallback);
      if (populatedRecommendations.length > 0) {
        source = 'content_fallback';
      }
    } else if (preferenceProfile.hasSignals) {
      const artistCount = populatedRecommendations.filter((rec) => rec.recommendedType === 'ARTIST').length;
      const eventCount = populatedRecommendations.filter((rec) => rec.recommendedType === 'EVENT').length;
      if (artistCount < 1 || eventCount < 2 || populatedRecommendations.length < 6) {
        const contentBackfill = await hydrateRecommendations(await getContentBasedFallback(preferenceProfile));
        populatedRecommendations = mergeHydratedRecommendations(populatedRecommendations, contentBackfill);
      }
    }

    const sortedRecommendations = personaliseHydratedRecommendations(populatedRecommendations, preferenceProfile)
      .filter((r: any) => r && r.item)
      .sort((a: any, b: any) => b.score - a.score);
    const artists = sortedRecommendations
      .filter((rec: any) => rec.recommendedType === 'ARTIST')
      .map((rec: any) => ({ ...rec.item, score: rec.score, reason: rec.reason, layer: rec.layer }));
    const events = sortedRecommendations
      .filter((rec: any) => rec.recommendedType === 'EVENT')
      .map((rec: any) => ({ ...rec.item, score: rec.score, reason: rec.reason, layer: rec.layer }));

    res.json({
      success: true,
      data: sortedRecommendations,
      artists,
      events,
      count: sortedRecommendations.length,
      source,
      preferenceSummary: {
        city: preferenceProfile.city,
        cityLabel: preferenceProfile.cityLabel,
        topCategoryLabel: preferenceProfile.topCategoryLabel,
        topInterestLabel: preferenceProfile.topInterestLabel,
      },
    });

  } catch (error) {
    console.error('Recommendations Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
  }
};
