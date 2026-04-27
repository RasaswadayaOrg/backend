import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { createError } from '../middleware/error.middleware';
import { facebookService, FB_GRAPH_API } from '../services/facebook.service';
import { createId } from '@paralleldrive/cuid2';
import { AuthRequest } from '../middleware/auth.middleware';

// Minimum interval between auto-syncs (1 hour in milliseconds)
const SYNC_COOLDOWN_MS = 60 * 60 * 1000;
// In-memory tracker for last sync time per artist (simple approach for single-instance)
const lastSyncMap = new Map<string, number>();

export const getArtistPosts = async (req: Request, res: Response) => {
  const artistId = req.params.artistId as string;

  // 1. Fetch Artist to check Facebook connection
  const artist = await (prisma as any).artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      fbPageId: true,
      fbAccessToken: true,
      fbTokenExpiresAt: true,
      fbSourceType: true,
    },
  });

  if (!artist) {
    throw createError('Artist not found', 404);
  }

  // 2. Fetch local posts
  const posts = await (prisma as any).post.findMany({
    where: { artistId },
    orderBy: { publishedAt: 'desc' },
  });

  // 3. Trigger background sync if Facebook is connected, token is valid, and cooldown has passed
  const artistData = artist as any;
  if (artistData.fbPageId && artistData.fbAccessToken) {
    const tokenExpired = facebookService.isTokenExpired(artistData.fbTokenExpiresAt);
    const lastSync = lastSyncMap.get(artistId) || 0;
    const cooldownPassed = Date.now() - lastSync > SYNC_COOLDOWN_MS;

    if (!tokenExpired && cooldownPassed) {
      lastSyncMap.set(artistId, Date.now());
      try {
        const sourceType = artistData.fbSourceType === 'profile' ? 'profile' : 'page';
        const synced = await facebookService.syncPosts(artistId, artistData.fbAccessToken, artistData.fbPageId, sourceType as 'page' | 'profile');
        if (synced > 0) {
          // Re-fetch after sync if new posts were added
          const updatedPosts = await (prisma as any).post.findMany({
            where: { artistId },
            orderBy: { publishedAt: 'desc' },
          });
          return res.json(updatedPosts || []);
        }
      } catch (e) {
        console.error('Background sync failed:', e);
      }
    }
  }

  res.json(posts || []);
};

export const createPost = async (req: AuthRequest, res: Response) => {
  const artistId = req.params.artistId as string;
  const { title, content, videoUrl } = req.body;
  const imageFile = req.file;

  // Authorization check
  const userId = req.user?.id;
  if (!userId) {
    throw createError('Unauthorized', 401);
  }

  // cast prisma to any to avoid type inference issues with extensions
  const artist = await (prisma as any).artist.findUnique({
    where: { id: artistId },
    select: { userId: true },
  });

  if (!artist || artist.userId !== userId) {
    throw createError('Unauthorized', 403);
  }

  let imageUrl = null;
  if (imageFile) {
      // In production, upload to S3/Cloudinary and get URL
      // For local dev, construct local path
      imageUrl = `/uploads/posts/${imageFile.filename}`;
  }

  const post = await (prisma as any).post.create({
    data: {
      title,
      content,
      imageUrl,
      videoUrl,
      source: 'RASASWADAYA',
      artistId,
      publishedAt: new Date(),
    }
  });

  res.json({ success: true, data: post });
};

export const updatePost = async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const { title, content, imageUrl, videoUrl } = req.body;
  const userId = req.user?.id;

  if (!userId) throw createError('Unauthorized', 401);

  // Check ownership via artist relation
  // We first fetch the post with artist info
  const post = await (prisma as any).post.findUnique({
      where: { id: postId },
      include: { artist: { select: { userId: true } } }
  });

  if (!post) throw createError('Post not found', 404);
  if (post.artist?.userId !== userId && req.user?.role !== 'ADMIN') {
      throw createError('Unauthorized', 403);
  }

  const updatedPost = await (prisma as any).post.update({
      where: { id: postId },
      data: {
          title,
          content,
          imageUrl,
          videoUrl,
          updatedAt: new Date(),
      }
  });

  res.json({ success: true, data: updatedPost });
};

export const getPostById = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const post = await (prisma as any).post.findUnique({
    where: { id: postId },
    include: { artist: true }
  });

  if (!post) throw createError('Post not found', 404);
  res.json(post);
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const userId = req.user?.id;

  if (!userId) throw createError('Unauthorized', 401);

  const post = await (prisma as any).post.findUnique({
    where: { id: postId },
    include: { artist: { select: { userId: true } } }
  });

  if (!post) throw createError('Post not found', 404);
  
  if (post.artist?.userId !== userId && req.user?.role !== 'ADMIN') {
      throw createError('Unauthorized', 403);
  }

  await (prisma as any).post.delete({ where: { id: postId } });
  res.json({ success: true, message: 'Post deleted successfully' });
};

// Connect Facebook with User Access Token (Implicit Flow)
export const connectFacebookWithUserToken = async (req: AuthRequest, res: Response) => {
  const artistId = req.params.artistId as string;
  const { userAccessToken } = req.body;

  if (!userAccessToken) {
    throw createError('User Access Token is required', 400);
  }

  const userId = req.user?.id;
  if (!userId) {
      throw createError('Unauthorized', 401);
  }
  
  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist || artist.userId !== userId) {
      throw createError('Unauthorized', 403);
  }

  // 1. Get Page ID and Page Access Token from Facebook Graph API
  try {
    const response = await fetch(
      `${FB_GRAPH_API}/me/accounts?access_token=${userAccessToken}`
    );
    
    if (!response.ok) {
        const errorData: any = await response.json();
        throw createError(errorData.error?.message || 'Failed to fetch Facebook pages', 400);
    }

    const data: any = await response.json();
    const pages = data.data;

    let pageId: string;
    let pageAccessToken: string;
    let pageName: string | undefined;
    let syncSource: 'page' | 'profile' = 'page';

    if (pages && pages.length > 0) {
      // Use the first managed Page
      const page = pages[0];
      pageId = page.id;
      pageAccessToken = page.access_token;
      pageName = page.name;
    } else {
      // No Pages found — fall back to user's own profile feed
      // Fetch user's profile ID
      const meRes = await fetch(`${FB_GRAPH_API}/me?fields=id,name&access_token=${userAccessToken}`);
      if (!meRes.ok) {
        throw createError('Failed to fetch Facebook profile. Please try again.', 400);
      }
      const meData: any = await meRes.json();
      pageId = meData.id;
      pageAccessToken = userAccessToken; // Use the user token directly for profile feed
      pageName = meData.name;
      syncSource = 'profile';
    }

    // 2. Save Page/Profile ID and Access Token
    await (prisma as any).artist.update({
        where: { id: artistId },
        data: {
            fbPageId: pageId,
            fbAccessToken: pageAccessToken,
            fbTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            fbSourceType: syncSource, // 'page' or 'profile'
        }
    });

    // 3. Sync posts from the page or profile feed
    await facebookService.syncPosts(artistId, pageAccessToken, pageId, syncSource);

    // 4. Return success
    res.json({ 
        success: true, 
        message: syncSource === 'page'
          ? `Facebook page "${pageName}" connected and posts synced successfully.`
          : `Facebook profile "${pageName}" connected and posts synced successfully. (No Pages found — using profile feed)`,
        pageName: pageName,
        pageId: pageId,
        source: syncSource,
    });

  } catch (error: any) {
    console.error('Facebook connection error:', error);
    // Preserve original status code if it's an ApiError
    if (error.statusCode) {
      throw error;
    }
    throw createError(error.message || 'Failed to connect Facebook', 500);
  }
};

export const syncFacebook = async (req: AuthRequest, res: Response) => {
  const artistId = req.params.artistId as string;
  const user = req.user;

  // Verify ownership
  // cast prisma to any to avoid type inference issues with extensions
  const artist = await (prisma as any).artist.findFirst({
    where: {
      id: artistId,
      userId: user?.id,
    },
    select: {
      id: true,
      fbPageId: true,
      fbAccessToken: true,
      fbTokenExpiresAt: true,
      fbSourceType: true,
      userId: true
    }
  });

  // cast artist to any because TS infers it as null or missing properties due to above issues
  const artistData = artist as any;

  if (!artistData || (!artistData.fbPageId && user?.role !== 'ADMIN')) {
    throw createError('Not authorized to sync this artist pages', 403);
  }

  if (!artistData.fbAccessToken || !artistData.fbPageId) {
     throw createError('Facebook not connected for this artist', 400);
  }

  // Check if token has expired
  if (facebookService.isTokenExpired(artistData.fbTokenExpiresAt)) {
    throw createError('Facebook token has expired. Please reconnect your Facebook page.', 401);
  }

  try {
    const sourceType = artistData.fbSourceType === 'profile' ? 'profile' : 'page';
    const count = await facebookService.syncPosts(artistData.id, artistData.fbAccessToken, artistData.fbPageId, sourceType as 'page' | 'profile');
    res.json({ success: true, message: `Synced ${count} posts from Facebook` });
  } catch (error) {
    throw error;
  }
};
