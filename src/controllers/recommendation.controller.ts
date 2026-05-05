import { Response } from 'express';
import { prisma } from '../lib/db';
import { AuthRequest } from '../middleware/auth.middleware';

export const getUserRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    let populatedRecommendations = [];

    try {
      // Step 1: Try to get Real-Time Recommendations from AI API
      let aiResponse = await fetch(`http://localhost:8000/recommend/${userId}`);
      
      // If user is not found in AI graph, trigger a refresh to sync DB to AI
      if (aiResponse.status === 404) {
        console.log("User not found in AI graph. Triggering AI model DB sync...");
        await fetch(`http://localhost:8000/refresh`, { method: 'POST' });
        // Retry after sync
        aiResponse = await fetch(`http://localhost:8000/recommend/${userId}`);
      }

      if (aiResponse.ok) {
        const liveData = await aiResponse.json() as any;
        
        // Process Artists
        const artistRecs = await Promise.all(
          (liveData.recommendations.artists || []).map(async (rec: any) => {
            const item = await prisma.artist.findUnique({
              where: { id: rec.artist_id },
              select: { id: true, name: true, profession: true, genre: true, photoUrl: true }
            });
            return item ? { recommendedId: rec.artist_id, score: rec.score, reason: 'AI Real-time match', item, type: 'artist' } : null;
          })
        );
        
        // Process Events
        const eventRecs = await Promise.all(
          (liveData.recommendations.events || []).map(async (rec: any) => {
            const item = await prisma.event.findUnique({
              where: { id: rec.event_id },
              select: { id: true, title: true, category: true, imageUrl: true, eventDate: true, description: true }
            });
            return item ? { recommendedId: rec.event_id, score: rec.score, reason: 'AI Real-time match', item, type: 'event' } : null;
          })
        );
        
        populatedRecommendations = [...artistRecs, ...eventRecs];

        // Save real-time recommendations back to fallback DB silently
        try {
          const recsToSave = [
            ...(liveData.recommendations.artists || []).map((r: any) => ({ recommendedId: r.artist_id, type: 'ARTIST', score: r.score })),
            ...(liveData.recommendations.events || []).map((r: any) => ({ recommendedId: r.event_id, type: 'EVENT', score: r.score }))
          ];

          if (recsToSave.length > 0) {
            // Delete old recommendations for this user
            // @ts-ignore
            await prisma.recommendation.deleteMany({ where: { userId } });
            
            // Insert new live recommendations
            // @ts-ignore
            await prisma.recommendation.createMany({
              data: recsToSave.map(rec => ({
                userId: userId,
                recommendedType: rec.type,
                recommendedId: rec.recommendedId,
                score: rec.score,
                reason: 'Auto-updated from live AI'
              }))
            });
          }
        } catch (dbError) {
          console.error("Failed to sync live recommendations to memory:", dbError);
        }
      }
    } catch (aiError) {
      console.log('Real-time AI API unreachable, falling back to DB recommendations...');
    }

    // Step 2: Fallback to Database if AI API failed or returned empty
    if (populatedRecommendations.length === 0) {
      // Fetch Artist and Event Recommendations from AI generated table
      // @ts-ignore
      const recommendations = await prisma.recommendation.findMany({
        where: { 
          userId: userId
        },
        orderBy: {
          score: 'desc'
        },
        take: 6
      });

      // Populate the details
      populatedRecommendations = await Promise.all(
        recommendations.map(async (rec: any) => {
          if (rec.recommendedType === 'ARTIST') {
            const artist = await prisma.artist.findUnique({
              where: { id: rec.recommendedId },
              select: { id: true, name: true, profession: true, genre: true, photoUrl: true }
            });
            return { ...rec, item: artist, type: 'artist' };
          } else if (rec.recommendedType === 'EVENT') {
            const event = await prisma.event.findUnique({
              where: { id: rec.recommendedId },
              select: { id: true, title: true, category: true, imageUrl: true, eventDate: true, description: true }
            });
            return { ...rec, item: event, type: 'event' };
          }
          return null;
        })
      );
    }

    res.json({
      success: true,
      data: populatedRecommendations.filter((r: any) => r && r.item).sort((a: any, b: any) => b.score - a.score)
    });

  } catch (error) {
    console.error('Recommendations Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
  }
};
