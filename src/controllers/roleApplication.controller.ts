import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';

export const applyForRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { role, bio, portfolioUrl } = req.body;
    const file = req.file;

    // Validate role
    if (!role || !['ARTIST', 'ORGANIZER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be ARTIST or ORGANIZER.' });
    }

    // Check existing pending application
    const existing = await prisma.roleApplication.findFirst({
      where: {
        userId,
        role: role as any,
        status: 'PENDING'
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'You already have a pending application for this role.' });
    }

    // Check if user already has the role
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    if (user?.role === role) {
        return res.status(400).json({ error: 'You already have this role.' });
    }

    let proofDocumentUrl = null;

    if (file) {
      // Upload to Supabase Storage
      const fileName = `${userId}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data, error } = await supabase
        .storage
        .from('documents') // Using a generic bucket name 'documents' - user must create this
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json({ error: 'Failed to upload proof document.' });
      }
      
      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName);
      proofDocumentUrl = publicUrlData.publicUrl;
    } else if (role === 'ARTIST') {
        // Require proof for Artist? Maybe optional for now or enforced by frontend?
        // Prompt says "add forms to collect ... proof documents".
        // I'll make it optional in backend but enforced in frontend if needed.
    }

    const application = await prisma.roleApplication.create({
      data: {
        userId,
        role: role as any,
        bio,
        portfolioUrl,
        proofDocumentUrl
      }
    });

    res.status(201).json(application);
  } catch (error: any) {
    console.error('Apply role error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
};

export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const applications = await prisma.roleApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};
