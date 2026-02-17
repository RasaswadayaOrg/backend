
import { supabase } from '../lib/supabase';

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

  // Set long-lived access token
  // In a real scenario, you'd exchange a short-lived user token for a long-lived page token here.
  // For now, we assume the frontend sends a valid page access token.
  
  async syncPosts(artistId: string, accessToken: string, pageId: string) {
    try {
      // Mocking Facebook API call for now or preparing for real implementation
      // const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,full_picture,created_time,permalink_url&access_token=${accessToken}`);
      // const data = await response.json();
      
      // MOCK DATA since we don't have a real token
      const mockPosts: FacebookPost[] = [
        {
          id: `${pageId}_mock1`,
          message: "Just finished a great concert at the Royal Albert Hall! 🎸",
          full_picture: "https://images.unsplash.com/photo-1501612780327-45045538702b?q=80&w=2070&auto=format&fit=crop",
          created_time: new Date().toISOString(),
        },
        {
          id: `${pageId}_mock2`,
          message: "New album dropping fast! Stay tuned.",
          full_picture: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2070&auto=format&fit=crop",
          created_time: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        }
      ];

      const posts = mockPosts; // In real impl: data.data

      // Save to Database
      for (const post of posts) {
        // Check if exists
        const { data: existing } = await supabase
          .from('Post')
          .select('id')
          .eq('externalId', post.id)
          .single();

        if (!existing) {
          await supabase.from('Post').insert({
            content: post.message,
            imageUrl: post.full_picture,
            source: 'FACEBOOK',
            externalId: post.id,
            publishedAt: post.created_time,
            artistId: artistId,
            updatedAt: new Date().toISOString(), // Manual update for now as trigger might not work on mock
          });
        }
      }
      
      return posts.length;
    } catch (error) {
      console.error('Error syncing Facebook posts:', error);
      throw error;
    }
  }
}

export const facebookService = FacebookService.getInstance();
