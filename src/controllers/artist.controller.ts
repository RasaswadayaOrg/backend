import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

// Get all artists with filters
export const getArtists = async (req: AuthRequest, res: Response) => {
  const {
    genre,
    profession,
    search,
    page = 1,
    limit = 10,
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('Artist')
    .select('*', { count: 'exact' });

  if (genre) {
    query = query.eq('genre', genre);
  }

  if (profession) {
    query = query.eq('profession', profession);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,bio.ilike.%${search}%`);
  }

  query = query.order('name', { ascending: true });
  query = query.range(offset, offset + Number(limit) - 1);

  const { data: artists, error, count } = await query;

  if (error) {
    throw createError('Failed to fetch artists', 500);
  }

  // Get follower counts for each artist
  const artistsWithCounts = await Promise.all(
    (artists || []).map(async (artist) => {
      const { count: followerCount } = await supabase
        .from('Follower')
        .select('id', { count: 'exact' })
        .eq('artistId', artist.id);
      return { ...artist, followerCount: followerCount || 0 };
    })
  );

  res.json({
    success: true,
    data: artistsWithCounts,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / Number(limit)),
    },
  });
};

// Get artist by ID
export const getArtistById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const { data: artist, error } = await supabase
    .from('Artist')
    .select(`
      *,
      user:User(id, email, fullName)
    `)
    .eq('id', id)
    .single();

  if (error || !artist) {
    throw createError('Artist not found', 404);
  }

  // Get follower count
  const { count: followerCount } = await supabase
    .from('Follower')
    .select('id', { count: 'exact' })
    .eq('artistId', id);

  // Check if current user follows this artist
  let isFollowing = false;
  if (userId) {
    const { data: follow } = await supabase
      .from('Follower')
      .select('id')
      .eq('userId', userId)
      .eq('artistId', id)
      .single();
    isFollowing = !!follow;
  }

  // Get upcoming performances
  const { data: performances } = await supabase
    .from('Performance')
    .select(`
      id,
      role,
      event:Event(id, title, eventDate, venue, city, imageUrl)
    `)
    .eq('artistId', id);

  res.json({
    success: true,
    data: {
      ...artist,
      followerCount: followerCount || 0,
      isFollowing,
      upcomingEvents: performances?.map((p) => p.event) || [],
    },
  });
};

// Create artist profile
export const createArtist = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const {
    name,
    profession,
    genre,
    bio,
    photoUrl,
    coverUrl,
    location,
    website,
    instagram,
    facebook,
  } = req.body;

  // Check if user already has an artist profile
  const { data: existingArtist } = await supabase
    .from('Artist')
    .select('id')
    .eq('userId', userId)
    .single();

  if (existingArtist) {
    throw createError('You already have an artist profile', 400);
  }

  const { data: artist, error } = await supabase
    .from('Artist')
    .insert({
      name,
      profession,
      genre,
      bio: bio || null,
      photoUrl: photoUrl || null,
      coverUrl: coverUrl || null,
      location: location || null,
      website: website || null,
      instagram: instagram || null,
      facebook: facebook || null,
      userId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Create artist error:', error);
    throw createError('Failed to create artist profile', 500);
  }

  // Update user role to ARTIST
  await supabase
    .from('User')
    .update({ role: 'ARTIST' })
    .eq('id', userId);

  res.status(201).json({
    success: true,
    message: 'Artist profile created successfully',
    data: artist,
  });
};

// Update artist profile
export const updateArtist = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // Check if artist exists and belongs to user
  const { data: artist, error: fetchError } = await supabase
    .from('Artist')
    .select('userId')
    .eq('id', id)
    .single();

  if (fetchError || !artist) {
    throw createError('Artist not found', 404);
  }

  if (artist.userId !== userId && userRole !== 'ADMIN') {
    throw createError('Not authorized to update this artist profile', 403);
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  const allowedFields = [
    'name', 'profession', 'genre', 'bio', 'photoUrl', 'coverUrl',
    'location', 'website', 'instagram', 'facebook'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const { data: updatedArtist, error } = await supabase
    .from('Artist')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to update artist profile', 500);
  }

  res.json({
    success: true,
    message: 'Artist profile updated successfully',
    data: updatedArtist,
  });
};

// Delete artist profile
export const deleteArtist = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Delete related records first
  await supabase.from('Follower').delete().eq('artistId', id);
  await supabase.from('Performance').delete().eq('artistId', id);

  const { error } = await supabase.from('Artist').delete().eq('id', id);

  if (error) {
    throw createError('Failed to delete artist', 500);
  }

  res.json({
    success: true,
    message: 'Artist deleted successfully',
  });
};

// Follow artist
export const followArtist = async (req: AuthRequest, res: Response) => {
  const { id: artistId } = req.params;
  const userId = req.user?.id;

  // Check if artist exists
  const { data: artist } = await supabase
    .from('Artist')
    .select('id')
    .eq('id', artistId)
    .single();

  if (!artist) {
    throw createError('Artist not found', 404);
  }

  // Check if already following
  const { data: existingFollow } = await supabase
    .from('Follower')
    .select('id')
    .eq('userId', userId)
    .eq('artistId', artistId)
    .single();

  if (existingFollow) {
    throw createError('Already following this artist', 400);
  }

  const { error } = await supabase.from('Follower').insert({
    userId,
    artistId,
  });

  if (error) {
    throw createError('Failed to follow artist', 500);
  }

  res.json({
    success: true,
    message: 'Now following artist',
  });
};

// Unfollow artist
export const unfollowArtist = async (req: AuthRequest, res: Response) => {
  const { id: artistId } = req.params;
  const userId = req.user?.id;

  const { error } = await supabase
    .from('Follower')
    .delete()
    .eq('userId', userId)
    .eq('artistId', artistId);

  if (error) {
    throw createError('Failed to unfollow artist', 500);
  }

  res.json({
    success: true,
    message: 'Unfollowed artist',
  });
};

// Get artist's followers
export const getArtistFollowers = async (req: AuthRequest, res: Response) => {
  const { id: artistId } = req.params;

  const { data: followers, error, count } = await supabase
    .from('Follower')
    .select(`
      id,
      createdAt,
      user:User(id, fullName)
    `, { count: 'exact' })
    .eq('artistId', artistId);

  if (error) {
    throw createError('Failed to fetch followers', 500);
  }

  res.json({
    success: true,
    data: followers,
    count: count || 0,
  });
};

// Get artist's events
export const getArtistEvents = async (req: AuthRequest, res: Response) => {
  const { id: artistId } = req.params;

  const { data: performances, error } = await supabase
    .from('Performance')
    .select(`
      id,
      role,
      event:Event(*)
    `)
    .eq('artistId', artistId);

  if (error) {
    throw createError('Failed to fetch artist events', 500);
  }

  const events = performances?.map((p) => ({
    ...p.event,
    performanceRole: p.role,
  })) || [];

  res.json({
    success: true,
    data: events,
  });
};

// Get user's followed artists
export const getUserFollowedArtists = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const { data: follows, error } = await supabase
    .from('Follower')
    .select(`
      id,
      createdAt,
      artist:Artist(*)
    `)
    .eq('userId', userId);

  if (error) {
    throw createError('Failed to fetch followed artists', 500);
  }

  const artists = follows?.map((f) => f.artist) || [];

  res.json({
    success: true,
    data: artists,
  });
};
