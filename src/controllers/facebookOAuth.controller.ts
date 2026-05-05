import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import { createId } from '@paralleldrive/cuid2';
import { FB_GRAPH_API, FB_GRAPH_API_VERSION } from '../services/facebook.service';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/auth/facebook/callback';

// Step 1: Generate the Facebook OAuth URL
export const getAuthUrl = async (req: AuthRequest, res: Response) => {
  if (!FACEBOOK_APP_ID) {
    throw createError('Facebook App ID not configured', 500);
  }

  const scopes = ['public_profile', 'pages_show_list', 'pages_read_engagement', 'user_posts'].join(',');

  const authUrl = `https://www.facebook.com/${FB_GRAPH_API_VERSION}/dialog/oauth?` +
    `client_id=${FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}` +
    `&scope=${scopes}` +
    `&response_type=code` +
    `&state=${req.user?.id || 'unknown'}`;

  res.json({ authUrl });
};

// Step 2: Exchange the OAuth code for a user access token
export const handleCallback = async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    throw createError('Authorization code is required', 400);
  }

  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    throw createError('Facebook OAuth not configured', 500);
  }

  // Exchange code for short-lived user token
  const tokenUrl = `${FB_GRAPH_API}/oauth/access_token?` +
    `client_id=${FACEBOOK_APP_ID}` +
    `&client_secret=${FACEBOOK_APP_SECRET}` +
    `&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}` +
    `&code=${code}`;

  const tokenRes = await fetch(tokenUrl);
  const tokenData: any = await tokenRes.json();

  if (tokenData.error) {
    console.error('Facebook token exchange error:', tokenData.error);
    throw createError(tokenData.error.message || 'Failed to exchange code', 400);
  }

  // Exchange for a long-lived token (60 days)
  const longLivedUrl = `${FB_GRAPH_API}/oauth/access_token?` +
    `grant_type=fb_exchange_token` +
    `&client_id=${FACEBOOK_APP_ID}` +
    `&client_secret=${FACEBOOK_APP_SECRET}` +
    `&fb_exchange_token=${tokenData.access_token}`;

  const longLivedRes = await fetch(longLivedUrl);
  const longLivedData: any = await longLivedRes.json();

  const userAccessToken = longLivedData.access_token || tokenData.access_token;
  const expiresIn = longLivedData.expires_in || 5184000; // default 60 days

  // Get user's managed pages
  const pagesRes = await fetch(`${FB_GRAPH_API}/me/accounts?access_token=${userAccessToken}`);
  const pagesData: any = await pagesRes.json();

  if (pagesData.error) {
    console.error('Facebook pages error:', pagesData.error);
    throw createError('Failed to fetch Facebook pages', 400);
  }

  const pages = (pagesData.data || []).map((page: any) => ({
    id: page.id,
    name: page.name,
    accessToken: page.access_token,
    category: page.category,
  }));

  res.json({
    userAccessToken,
    expiresIn,
    pages,
  });
};

// Step 3: Save the selected page to the artist profile
export const selectPage = async (req: AuthRequest, res: Response) => {
  const artistId = req.params.artistId as string;
  const { pageId, pageAccessToken, pageName } = req.body;

  if (!pageId || !pageAccessToken) {
    throw createError('Page ID and access token are required', 400);
  }

  // Verify artist belongs to user
  const { data: artist, error: artistError } = await supabase
    .from('Artist')
    .select('id, userId')
    .eq('id', artistId)
    .single();

  if (artistError || !artist) {
    throw createError('Artist not found', 404);
  }

  if (artist.userId !== req.user?.id) {
    throw createError('Not authorized', 403);
  }

  // Save page info to artist
  const { error } = await supabase
    .from('Artist')
    .update({
      fbPageId: pageId,
      fbAccessToken: pageAccessToken,
      fbTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq('id', artistId);

  if (error) {
    throw createError('Failed to save Facebook page', 500);
  }

  // Trigger initial sync
  try {
    const { facebookService } = require('../services/facebook.service');
    await facebookService.syncPosts(artistId, pageAccessToken, pageId);
  } catch (e) {
    console.error('Initial sync failed (non-fatal):', e);
  }

  res.json({ message: `Facebook page "${pageName || pageId}" connected successfully.` });
};

// Step 4: Fetch Live Facebook Feed (Directly from FB, without syncing to DB)
export const getLiveFacebookFeed = async (req: AuthRequest, res: Response) => {
  const artistId = req.params.artistId as string;

  try {
    // 1. Fetch artist's FB credentials from DB
    const { data: artist, error } = await supabase
      .from('Artist')
      .select('id, fbPageId, fbAccessToken')
      .eq('id', artistId)
      .single();

    if (error || !artist) {
      throw createError('Artist not found', 404);
    }

    if (!artist.fbPageId || !artist.fbAccessToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Facebook Page is not connected. Please connect your Facebook page first.' 
      });
    }

    // 2. Fetch directly from Facebook Graph API (No database save)
    // We are requesting posts, the message, pictures, and creation time
    const fbApiUrl = `${FB_GRAPH_API}/${artist.fbPageId}/posts?` +
      `fields=id,message,created_time,full_picture,permalink_url` +
      `&access_token=${artist.fbAccessToken}` +
      `&limit=10`; // Fetch the latest 10 posts

    const fbRes = await fetch(fbApiUrl);
    const fbData: any = await fbRes.json();

    if (fbData.error) {
      console.error('Facebook live API error:', fbData.error);
      if (fbData.error.code === 190) {
        return res.status(401).json({ success: false, message: 'Facebook token expired. Please reconnect.' });
      }
      throw createError('Failed to fetch from Facebook API', 500);
    }

    // 3. Format the data to match the Dashboard's expected Post structure without saving
    const livePosts = (fbData.data || []).map((post: any) => ({
      id: `live_fb_${post.id}`,
      artistId: artist.id,
      content: post.message || '',
      imageUrl: post.full_picture || null,
      videoUrl: null,
      source: 'FACEBOOK', // Identifies that this is a Facebook post
      externalId: post.id,
      facebookUrl: post.permalink_url, // Direct link to FB
      createdAt: post.created_time,
      updatedAt: post.created_time,
      likesCount: 0,
      commentsCount: 0,
      isLiveProxy: true // Custom flag to inform frontend this isn't from our DB
    }));

    // 4. Return directly to frontend
    res.json({
      success: true,
      message: 'Live Facebook feed fetched successfully',
      data: livePosts
    });
    
  } catch (error: any) {
    throw createError(error.message || 'Error fetching live Facebook feed', error.statusCode || 500);
  }
};
