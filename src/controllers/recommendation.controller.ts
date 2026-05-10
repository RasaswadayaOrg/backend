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
  category: true,
  subCategory: true,
};

const eventSelect = {
  id: true,
  title: true,
  category: true,
  subCategory: true,
  imageUrl: true,
  eventDate: true,
  description: true,
  city: true,
  location: true,
  venue: true,
};

// When a user has chosen explicit art-forms (music / dance / film / drama),
// recommendations from a different art-form are excluded outright. Items
// whose `category` is empty / null are kept (legacy / generic items) so
// they can still appear when relevant on other signals.
const ART_FORMS = new Set(['music', 'dance', 'film', 'drama']);

const itemArtForm = (item: any): string | null => {
  if (!item) return null;
  const raw = String(item.category || '').trim().toLowerCase();
  if (!raw) return null;
  return ART_FORMS.has(raw) ? raw : null;
};

const passesArtFormFilter = (profile: PreferenceProfile, item: any): boolean => {
  if (!profile.artForms || profile.artForms.length === 0) return true;
  const form = itemArtForm(item);
  // When the user has chosen explicit art-forms, REQUIRE a matching form on
  // the item. Unclassified items are dropped — better to show fewer than to
  // pollute a "drama" feed with uncategorised musicians.
  if (!form) return false;
  return profile.artForms.includes(form);
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

// Token-aware term match. Splits each candidate value into normalised tokens
// and only credits a hit when a preference term equals one of those tokens
// (or when the term is a multi-word phrase that appears as a contiguous
// substring of the value). Avoids the previous behaviour where 'art' would
// match 'artist', 'artistic', etc.
const scoreTermMatch = (profile: PreferenceProfile, values: Array<string | null | undefined>) => {
  let score = 0;
  const matchedTerms = new Set<string>();

  for (const value of values) {
    const normalised = normalise(value);
    if (!normalised) continue;
    const tokens = new Set<string>(normalised.split('_').filter((part) => part.length > 1));
    tokens.add(normalised);

    for (const term of profile.matchTerms) {
      if (matchedTerms.has(term) || term.length < 3) continue;
      const isExactToken = tokens.has(term);
      // Only allow phrase-level fuzzy match for multi-token terms (e.g.
      // 'kandyan_dance' against 'kandyan_dance_troupe'). Single short words
      // must match a token exactly.
      const isPhraseMatch = term.includes('_') && normalised.includes(term);
      if (isExactToken) {
        score += 0.18;
        matchedTerms.add(term);
      } else if (isPhraseMatch) {
        score += 0.12;
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

  // Boost for an exact art-form / sub-category match — the strongest signal
  // we have. Without this the controller used to give equal weight to a
  // genre fragment match and an exact category match.
  let categoryBoost = 0;
  const form = itemArtForm(rec.item);
  if (form && profile.artForms.includes(form)) categoryBoost += 0.12;
  const subCategory = normalise(rec.item.subCategory);
  if (subCategory && profile.matchTerms.has(subCategory)) categoryBoost += 0.10;

  if (rec.recommendedType === 'ARTIST') {
    return Math.min(
      0.5,
      categoryBoost
      + scoreTermMatch(profile, [rec.item.genre, rec.item.profession, rec.item.subCategory, rec.item.location])
      + scoreCityMatch(profile, [rec.item.location], 0.06)
    );
  }

  return Math.min(
    0.55,
    categoryBoost
    + scoreTermMatch(profile, [rec.item.category, rec.item.subCategory, rec.item.title, rec.item.city, rec.item.location, rec.item.venue, rec.item.description])
    + scoreCityMatch(profile, [rec.item.city, rec.item.location, rec.item.venue], 0.18)
  );
};

const personaliseHydratedRecommendations = (recommendations: any[], profile: PreferenceProfile) => recommendations
  .filter((rec) => passesArtFormFilter(profile, rec?.item))
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

  // Apply hard art-form filter when the user has explicit preferences.
  const filteredArtists = artists.filter((a) => passesArtFormFilter(profile, a));
  const filteredEvents = events.filter((e) => passesArtFormFilter(profile, e));

  const reasonTarget = profile.topInterestLabel !== 'Not selected'
    ? profile.topInterestLabel
    : profile.topCategoryLabel !== 'Not selected'
      ? profile.topCategoryLabel
      : profile.cityLabel || 'location';

  const artistCandidates = filteredArtists.map((artist) => {
    const termScore = scoreTermMatch(profile, [artist.genre, artist.profession, artist.subCategory, artist.location]);
    const cityScore = scoreCityMatch(profile, [artist.location], 0.06);
    const formMatch = profile.artForms.includes(itemArtForm(artist) || '') ? 0.10 : 0;
    const score = Math.min(0.99, 0.30 + termScore + cityScore + formMatch);
    return {
      recommendedId: artist.id,
      recommendedType: 'ARTIST' as RecommendationType,
      score,
      relevance: termScore + cityScore + formMatch,
      reason: profile.hasSignals ? `Matched to your ${reasonTarget} preference` : 'Popular cultural artist',
    };
  });

  const eventCandidates = filteredEvents.map((event) => {
    const termScore = scoreTermMatch(profile, [event.category, event.subCategory, event.title, event.city, event.location, event.venue, event.description]);
    const cityScore = scoreCityMatch(profile, [event.city, event.location, event.venue], 0.18);
    const formMatch = profile.artForms.includes(itemArtForm(event) || '') ? 0.10 : 0;
    const score = Math.min(0.99, 0.30 + termScore + cityScore + formMatch);
    return {
      recommendedId: event.id,
      recommendedType: 'EVENT' as RecommendationType,
      score,
      relevance: termScore + cityScore + formMatch,
      reason: profile.hasSignals ? `Matched to your ${reasonTarget} preference` : 'Upcoming cultural event',
    };
  });

  // When the user has signals, drop candidates with zero relevance — they
  // would otherwise be ranked by the constant 0.30 base score and surface
  // as if they were preference matches.
  const minRelevance = profile.hasSignals ? 0.04 : 0;
  const rankedArtists = artistCandidates
    .filter((c) => c.relevance >= minRelevance)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const rankedEvents = eventCandidates
    .filter((c) => c.relevance >= minRelevance)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return [...rankedEvents, ...rankedArtists]
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ relevance: _r, ...rest }) => rest);
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
