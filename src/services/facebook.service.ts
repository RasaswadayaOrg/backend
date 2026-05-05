
import { prisma } from '../lib/db';

// Shared Facebook Graph API version — keep in sync with facebookOAuth.controller.ts
export const FB_GRAPH_API_VERSION = 'v22.0';
export const FB_GRAPH_API = `https://graph.facebook.com/${FB_GRAPH_API_VERSION}`;

interface FacebookPost {
  id: string;
  message?: string;
  full_picture?: string;
  created_time: string;
  permalink_url?: string;
}

interface FacebookPaginatedResponse {
  data: FacebookPost[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

export class FacebookService {
  private static instance: FacebookService;
  private static readonly MAX_PAGES = 5; // Limit pagination to avoid excessive API calls

  private constructor() {}

  public static getInstance(): FacebookService {
    if (!FacebookService.instance) {
      FacebookService.instance = new FacebookService();
    }
    return FacebookService.instance;
  }

  /**
   * Check if a Facebook access token has expired.
   */
  isTokenExpired(expiresAt: Date | string | null | undefined): boolean {
    if (!expiresAt) return true;
    const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    // Consider expired if less than 1 hour remaining (buffer for in-flight requests)
    return expiry.getTime() - Date.now() < 60 * 60 * 1000;
  }

  /**
   * Sync Facebook posts for an artist. Handles pagination and deduplication.
   * Skips posts that have no message AND no image (empty posts).
   * @param sourceType 'page' for Page posts, 'profile' for user's own feed
   */
  async syncPosts(artistId: string, accessToken: string, pageId: string, sourceType: 'page' | 'profile' = 'page'): Promise<number> {
    let totalSynced = 0;
    // Use /posts for Pages (only page-published posts) or /feed for profiles
    const endpoint = sourceType === 'profile' ? 'feed' : 'posts';
    let nextUrl: string | null =
      `${FB_GRAPH_API}/${pageId}/${endpoint}?fields=id,message,full_picture,created_time,permalink_url&limit=25&access_token=${accessToken}`;

    try {
      let pageCount = 0;

      while (nextUrl && pageCount < FacebookService.MAX_PAGES) {
        pageCount++;

        const response = await fetch(nextUrl);

        if (!response.ok) {
          const errorBody: any = await response.json().catch(() => ({}));
          // If token is invalid/expired, throw a specific error so callers can handle it
          if (response.status === 401 || response.status === 400) {
            throw new Error(
              `Facebook token error: ${errorBody?.error?.message || response.statusText}`
            );
          }
          throw new Error(`Facebook API error: ${response.statusText}`);
        }

        const data: FacebookPaginatedResponse = await response.json() as FacebookPaginatedResponse;
        const posts: FacebookPost[] = data.data || [];

        for (const post of posts) {
          // Skip empty posts (no message AND no image)
          if (!post.message && !post.full_picture) {
            continue;
          }

          // ONLY sync posts that contain the '@rasaswadaya' tag in the message
          if (!post.message || !post.message.toLowerCase().includes('@rasaswadaya')) {
            continue;
          }

          const existing = await (prisma as any).post.findFirst({
            where: { externalId: post.id },
            select: { id: true },
          });

          if (!existing) {
            await (prisma as any).post.create({
              data: {
                content: post.message || null,
                imageUrl: post.full_picture || null,
                source: 'FACEBOOK',
                externalId: post.id,
                publishedAt: new Date(post.created_time),
                artistId: artistId,
              },
            });
            totalSynced++;
          }
        }

        // Follow pagination cursor
        nextUrl = data.paging?.next || null;
      }

      return totalSynced;
    } catch (error) {
      console.error('Error syncing Facebook posts:', error);
      // Don't throw to avoid crashing the request, just log
      return 0;
    }
  }
}

export const facebookService = FacebookService.getInstance();
