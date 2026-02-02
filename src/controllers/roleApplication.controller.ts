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
      
      try {
        const { data, error } = await supabase
          .storage
          .from('documents') // Using a generic bucket name 'documents' - user must create this
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true
          });

        if (error) {
          console.error('Supabase upload error:', error);
          // Don't fail the entire request if upload fails
          // Just log the error and continue without the document
          console.warn('Continuing without proof document due to upload error');
        } else {
          const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName);
          proofDocumentUrl = publicUrlData.publicUrl;
        }
      } catch (uploadError) {
        console.error('Supabase upload exception:', uploadError);
        console.warn('Continuing without proof document');
      }
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

// Admin: Get all role applications
export const getAllApplications = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.roleApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Number(limit)
      }),
      prisma.roleApplication.count({ where })
    ]);

    res.json({
      success: true,
      data: applications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// Admin: Approve or reject application
export const updateApplicationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be APPROVED or REJECTED.' });
    }

    const applicationId = Array.isArray(id) ? id[0] : id;

    const application = await prisma.roleApplication.findUnique({
      where: { id: applicationId },
      include: { user: true }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending applications can be updated' });
    }

    // Update application status
    const updatedApplication = await prisma.roleApplication.update({
      where: { id: applicationId },
      data: {
        status: status as any,
        notes: notes || null,
        updatedAt: new Date()
      }
    });

    // If approved, update user role
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: application.userId },
        data: { role: application.role as any }
      });
    }

    res.json({
      success: true,
      message: `Application ${status.toLowerCase()} successfully`,
      data: updatedApplication
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
};
