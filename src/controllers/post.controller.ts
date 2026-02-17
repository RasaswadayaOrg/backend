
import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { createError } from '../middleware/error.middleware';
import { facebookService } from '../services/facebook.service';
import { createId } from '@paralleldrive/cuid2';

export const getArtistPosts = async (req: Request, res: Response) => {
  const artistId = req.params.artistId as string;

  // 1. Fetch Artist to check Facebook connection
  const { data: artist, error: artistError } = await supabase
    .from('Artist')
    .select('id, fbPageId, fbAccessToken, fbTokenExpiresAt')
    .eq('id', artistId)
    .single();

  if (artistError || !artist) {
    throw createError('Artist not found', 404);
  }

  // 2. Fetch local posts
  const { data: posts, error } = await supabase
    .from('Post')
    .select('*')
    .eq('artistId', artistId)
    .order('publishedAt', { ascending: false });

  if (error) {
    throw createError('Failed to fetch posts', 500);
  }

  // 3. Trigger async sync if connected (non-blocking) - For MVP maybe sync on demand or periodically.
  // For simplicity, we trigger sync if no posts found or older than 1 hour. But to keep response fast, we don't await.
  if (artist.fbPageId && artist.fbAccessToken) {
    // Fire and forget sync (or could be a background job)
    // console.log('Triggering Facebook sync for artist:', artistId);
    // facebookService.service.syncPosts(artist.id, artist.fbAccessToken, artist.fbPageId).catch(console.error);
    // NOTE: For demo, let's await it if the list is empty to ensure user sees something immediately
     if (!posts || posts.length === 0) {
        try {
           await facebookService.syncPosts(artistId, artist.fbAccessToken, artist.fbPageId);
           // Re-fetch after sync
           const { data: newPosts } = await supabase
            .from('Post')
            .select('*')
            .eq('artistId', artistId)
            .order('publishedAt', { ascending: false });
           return res.json(newPosts || []);
        } catch (e) {
           console.error("Sync failed", e);
        }
     }
  }

  res.json(posts || []);
};

export const createPost = async (req: Request, res: Response) => {
  const artistId = req.params.artistId as string;
  const { content, imageUrl, videoUrl } = req.body;

  /* 
  // Authorization check (artistId must match current user's artist profile)
  // Assuming req.user is populated by auth middleware
  const userId = req.user.id;
  const { data: artist } = await supabase.from('Artist').select('id, userId').eq('id', artistId).single();
  if (!artist || artist.userId !== userId) {
    throw createError('Unauthorized', 403);
  }
  */

  const { data, error } = await supabase.from('Post').insert({
    id: createId(),
    content,
    imageUrl,
    videoUrl,
    source: 'RASASWADAYA',
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    artistId,
  }).select().single();

  if (error) {
    throw createError('Failed to create post', 500);
  }

  res.status(201).json(data);
};

export const connectFacebook = async (req: Request, res: Response) => {
  const artistId = req.params.artistId as string;
  const { pageId, accessToken } = req.body;

  // Validate inputs
  if (!pageId || !accessToken) {
    throw createError('Page ID and Access Token are required', 400);
  }

  // Update Artist record
  const { error } = await supabase
    .from('Artist')
    .update({
      fbPageId: pageId,
      fbAccessToken: accessToken,
      fbTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // Assume 60 days for long-lived token
      updatedAt: new Date().toISOString(),
    })
    .eq('id', artistId);

  if (error) {
    throw createError('Failed to connect Facebook', 500);
  }

  // Initial Sync
  await facebookService.syncPosts(artistId, accessToken, pageId);

  res.json({ message: 'Facebook connected successfully and posts synced.' });
};
