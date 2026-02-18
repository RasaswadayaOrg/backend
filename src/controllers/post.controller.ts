import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { createError } from '../middleware/error.middleware';
import { facebookService } from '../services/facebook.service';
import { createId } from '@paralleldrive/cuid2';
import { AuthRequest } from '../middleware/auth.middleware';

export const getArtistPosts = async (req: Request, res: Response) => {
  const artistId = req.params.artistId as string;

  // 1. Fetch Artist to check Facebook connection
  // cast prisma to any to avoid type inference issues with extensions
  const artist = await (prisma as any).artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      fbPageId: true,
      fbAccessToken: true,
      fbTokenExpiresAt: true,
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

  // 3. Trigger async sync if connected
  const artistData = artist as any;
  if (artistData.fbPageId && artistData.fbAccessToken) {
     if (!posts || posts.length === 0) {
        try {
           await facebookService.syncPosts(artistId, artistData.fbAccessToken, artistData.fbPageId);
           // Re-fetch after sync
           const newPosts = await (prisma as any).post.findMany({
             where: { artistId },
             orderBy: { publishedAt: 'desc' },
           });
           return res.json(newPosts || []);
        } catch (e) {
           console.error("Sync failed", e);
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

export const connectFacebook = async (req: AuthRequest, res: Response) => {
  const artistId = req.params.artistId as string;
  const { pageId, accessToken } = req.body;

  if (!pageId || !accessToken) {
    throw createError('Page ID and Access Token are required', 400);
  }

  const userId = req.user?.id;
  if (!userId) {
      throw createError('Unauthorized', 401);
  }
  
  const artist = await (prisma as any).artist.findUnique({ where: { id: artistId } });
  if (!artist || artist.userId !== userId) {
      throw createError('Unauthorized', 403);
  }

  await (prisma as any).artist.update({
      where: { id: artistId },
      data: {
          fbPageId: pageId,
          fbAccessToken: accessToken,
          fbTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      }
  });

  // Initial Sync
  await facebookService.syncPosts(artistId, accessToken, pageId);

  res.json({ success: true, message: 'Facebook connected successfully.' });
};

// New endpoint for connect with User Token (Implicit Flow)
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
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`
    );
    
    if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch Facebook pages');
    }

    const data: any = await response.json();
    const pages = data.data;

    if (!pages || pages.length === 0) {
        throw createError('No Facebook Pages found for this user', 404);
    }

    // specific logic: select the first page (or could be enhanced to let user select)
    const page = pages[0];
    const { id: pageId, access_token: pageAccessToken } = page;

    // 2. Save Page ID and Page Access Token
    // cast prisma to any 
    await (prisma as any).artist.update({
        where: { id: artistId },
        data: {
            fbPageId: pageId,
            fbAccessToken: pageAccessToken,
            // Long-lived token exchange would be better here, but using what we got for now
            fbTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) 
        }
    });

    // 3. Fetch latest 5 posts and save them
    await facebookService.syncPosts(artistId, pageAccessToken, pageId);

    // 4. Return success
    res.json({ 
        success: true, 
        message: 'Facebook connected and posts synced successfully.',
        pageName: page.name,
        pageId: pageId
    });

  } catch (error: any) {
    console.error('Facebook connection error:', error);
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

  try {
    const count = await facebookService.syncPosts(artistData.id, artistData.fbAccessToken, artistData.fbPageId);
    res.json({ success: true, message: `Synced ${count} posts from Facebook` });
  } catch (error) {
    throw error;
  }
};
