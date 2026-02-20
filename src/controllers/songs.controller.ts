import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { createId } from '@paralleldrive/cuid2';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Get all posts/songs with images
export const getAllSongs = async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 12, artistId } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const userId = req.user?.id;

  const where: any = {
    imageUrl: { not: null }, // Only posts with images
  };

  if (artistId) {
    where.artistId = artistId as string;
  }

  const [posts, total] = await Promise.all([
    (prisma as any).post.findMany({
      where,
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            genre: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      skip: offset,
      take: Number(limit),
    }),
    (prisma as any).post.count({ where }),
  ]);

  // Check if user has liked each post
  let userLikes: Set<string> = new Set();
  if (userId) {
    const likes = await (prisma as any).postLike.findMany({
      where: {
        userId,
        postId: { in: posts.map((p: any) => p.id) },
      },
      select: { postId: true },
    });
    userLikes = new Set(likes.map((l: any) => l.postId));
  }

  const songsWithMeta = posts.map((post: any) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl?.startsWith('http') 
      ? post.imageUrl 
      : `${API_BASE_URL}${post.imageUrl}`,
    videoUrl: post.videoUrl,
    publishedAt: post.publishedAt,
    artist: post.artist,
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    isLiked: userLikes.has(post.id),
  }));

  res.json({
    songs: songsWithMeta,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
};

// Get single post/song by ID
export const getSongById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const post = await (prisma as any).post.findUnique({
    where: { id },
    include: {
      artist: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
          genre: true,
          bio: true,
          _count: {
            select: {
              followers: true,
            },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  if (!post) {
    throw createError('Song not found', 404);
  }

  // Check if user has liked this post
  let isLiked = false;
  let isFollowing = false;
  if (userId) {
    const [like, follow] = await Promise.all([
      (prisma as any).postLike.findUnique({
        where: { userId_postId: { userId, postId: id } },
      }),
      (prisma as any).follower.findUnique({
        where: { userId_artistId: { userId, artistId: post.artistId } },
      }),
    ]);
    isLiked = !!like;
    isFollowing = !!follow;
  }

  res.json({
    id: post.id,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl?.startsWith('http') 
      ? post.imageUrl 
      : `${API_BASE_URL}${post.imageUrl}`,
    videoUrl: post.videoUrl,
    publishedAt: post.publishedAt,
    artist: {
      ...post.artist,
      followersCount: post.artist._count.followers,
      isFollowing,
    },
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    isLiked,
  });
};

// Like a post
export const likePost = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if post exists
  const post = await (prisma as any).post.findUnique({ where: { id } });
  if (!post) {
    throw createError('Post not found', 404);
  }

  // Check if already liked
  const existingLike = await (prisma as any).postLike.findUnique({
    where: { userId_postId: { userId, postId: id } },
  });

  if (existingLike) {
    return res.json({ message: 'Already liked', liked: true });
  }

  await (prisma as any).postLike.create({
    data: {
      id: createId(),
      userId,
      postId: id,
    },
  });

  const likesCount = await (prisma as any).postLike.count({ where: { postId: id } });

  res.json({ message: 'Liked successfully', liked: true, likesCount });
};

// Unlike a post
export const unlikePost = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const existingLike = await (prisma as any).postLike.findUnique({
    where: { userId_postId: { userId, postId: id } },
  });

  if (!existingLike) {
    return res.json({ message: 'Not liked', liked: false });
  }

  await (prisma as any).postLike.delete({
    where: { userId_postId: { userId, postId: id } },
  });

  const likesCount = await (prisma as any).postLike.count({ where: { postId: id } });

  res.json({ message: 'Unliked successfully', liked: false, likesCount });
};

// Get comments for a post
export const getComments = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const [comments, total] = await Promise.all([
    (prisma as any).postComment.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Number(limit),
    }),
    (prisma as any).postComment.count({ where: { postId: id } }),
  ]);

  // Fetch user info for comments (using supabase since User is in supabase)
  const userIds = [...new Set(comments.map((c: any) => c.userId))];
  
  // Get user details from database
  const users = await (prisma as any).user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, avatarUrl: true },
  }) as Array<{ id: string; fullName: string; avatarUrl: string | null }>;
  
  const userMap = new Map(users.map((u) => [u.id, u]));

  const commentsWithUser = comments.map((comment: any) => {
    const user = userMap.get(comment.userId);
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: user ? {
        id: user.id,
        name: user.fullName,
        avatarUrl: user.avatarUrl,
      } : { id: comment.userId, name: 'Unknown User', avatarUrl: null },
    };
  });

  res.json({
    comments: commentsWithUser,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
};

// Add comment to a post
export const addComment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user!.id;

  // Check if post exists
  const post = await (prisma as any).post.findUnique({ where: { id } });
  if (!post) {
    throw createError('Post not found', 404);
  }

  const comment = await (prisma as any).postComment.create({
    data: {
      id: createId(),
      content,
      userId,
      postId: id,
    },
  });

  // Get user info
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, avatarUrl: true },
  }) as { id: string; fullName: string; avatarUrl: string | null } | null;

  res.status(201).json({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    user: {
      id: user?.id || userId,
      name: user?.fullName || 'Unknown User',
      avatarUrl: user?.avatarUrl || null,
    },
  });
};

// Delete comment
export const deleteComment = async (req: AuthRequest, res: Response) => {
  const { postId, commentId } = req.params;
  const userId = req.user!.id;

  const comment = await (prisma as any).postComment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw createError('Comment not found', 404);
  }

  if (comment.userId !== userId) {
    throw createError('Unauthorized to delete this comment', 403);
  }

  await (prisma as any).postComment.delete({
    where: { id: commentId },
  });

  res.json({ message: 'Comment deleted successfully' });
};

// Follow an artist
export const followArtist = async (req: AuthRequest, res: Response) => {
  const { artistId } = req.params;
  const userId = req.user!.id;

  // Check if artist exists
  const artist = await (prisma as any).artist.findUnique({ where: { id: artistId } });
  if (!artist) {
    throw createError('Artist not found', 404);
  }

  // Check if already following
  const existingFollow = await (prisma as any).follower.findUnique({
    where: { userId_artistId: { userId, artistId } },
  });

  if (existingFollow) {
    return res.json({ message: 'Already following', following: true });
  }

  await (prisma as any).follower.create({
    data: {
      id: createId(),
      userId,
      artistId,
    },
  });

  const followersCount = await (prisma as any).follower.count({ where: { artistId } });

  res.json({ message: 'Followed successfully', following: true, followersCount });
};

// Unfollow an artist
export const unfollowArtist = async (req: AuthRequest, res: Response) => {
  const { artistId } = req.params;
  const userId = req.user!.id;

  const existingFollow = await (prisma as any).follower.findUnique({
    where: { userId_artistId: { userId, artistId } },
  });

  if (!existingFollow) {
    return res.json({ message: 'Not following', following: false });
  }

  await (prisma as any).follower.delete({
    where: { userId_artistId: { userId, artistId } },
  });

  const followersCount = await (prisma as any).follower.count({ where: { artistId } });

  res.json({ message: 'Unfollowed successfully', following: false, followersCount });
};

// Check if user follows an artist
export const checkFollowing = async (req: AuthRequest, res: Response) => {
  const { artistId } = req.params;
  const userId = req.user!.id;

  const follow = await (prisma as any).follower.findUnique({
    where: { userId_artistId: { userId, artistId } },
  });

  res.json({ following: !!follow });
};
