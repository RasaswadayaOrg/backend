
import { prisma } from '../lib/db';

interface FacebookPost {
  id: string;
  message?: string;
  full_picture?: string;
  created_time: string;
  permalink_url?: string;
}

export class FacebookService {
  private static instance: FacebookService;

  private constructor() {}

  public static getInstance(): FacebookService {
    if (!FacebookService.instance) {
      FacebookService.instance = new FacebookService();
    }
    return FacebookService.instance;
  }
  
  async syncPosts(artistId: string, accessToken: string, pageId: string) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,full_picture,created_time,permalink_url&access_token=${accessToken}`
      );
      
      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const posts: FacebookPost[] = data.data || [];

      // Save to Database
      for (const post of posts) {
        const existing = await (prisma as any).post.findFirst({
          where: { externalId: post.id },
          select: { id: true }
        });

        if (!existing) {
          await (prisma as any).post.create({
            data: {
              content: post.message,
              imageUrl: post.full_picture,
              source: 'FACEBOOK', // Using string literal which Prisma accepts for enums usually
              externalId: post.id,
              publishedAt: new Date(post.created_time),
              artistId: artistId,
            }
          });
        }
      }
      
      return posts.length;
    } catch (error) {
      console.error('Error syncing Facebook posts:', error);
      // Don't throw to avoid crashing the request, just log
      return 0;
    }
  }
}

export const facebookService = FacebookService.getInstance();
