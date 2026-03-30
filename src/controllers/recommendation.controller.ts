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
    const populatedRecommendations = await Promise.all(
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

    res.json({
      success: true,
      data: populatedRecommendations.filter((r: any) => r && r.item)
    });

  } catch (error) {
    console.error('Recommendations Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
  }
};
