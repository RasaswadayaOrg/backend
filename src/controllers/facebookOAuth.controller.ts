import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import { createId } from '@paralleldrive/cuid2';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/auth/facebook/callback';
const GRAPH_API = 'https://graph.facebook.com/v22.0';

// Step 1: Generate the Facebook OAuth URL
export const getAuthUrl = async (req: AuthRequest, res: Response) => {
  if (!FACEBOOK_APP_ID) {
    throw createError('Facebook App ID not configured', 500);
  }

  const scopes = ['public_profile', 'pages_show_list', 'pages_read_engagement'].join(',');

  const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?` +
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
  const tokenUrl = `${GRAPH_API}/oauth/access_token?` +
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
  const longLivedUrl = `${GRAPH_API}/oauth/access_token?` +
    `grant_type=fb_exchange_token` +
    `&client_id=${FACEBOOK_APP_ID}` +
    `&client_secret=${FACEBOOK_APP_SECRET}` +
    `&fb_exchange_token=${tokenData.access_token}`;

  const longLivedRes = await fetch(longLivedUrl);
  const longLivedData: any = await longLivedRes.json();

  const userAccessToken = longLivedData.access_token || tokenData.access_token;
  const expiresIn = longLivedData.expires_in || 5184000; // default 60 days

  // Get user's managed pages
  const pagesRes = await fetch(`${GRAPH_API}/me/accounts?access_token=${userAccessToken}`);
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
