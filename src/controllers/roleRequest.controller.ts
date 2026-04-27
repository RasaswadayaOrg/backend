import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';

// Helper to validate role-specific requirements
const validateRoleRequirements = (
  role: string,
  documents: { [key: string]: any },
  textFields: { [key: string]: any }
): { valid: boolean; message?: string } => {
  switch (role) {
    case 'ARTIST':
      if (!textFields[role]) {
        return { valid: false, message: 'Portfolio link is required for Artist role' };
      }
      if (!documents[role]) {
        return { valid: false, message: 'Sample work document is required for Artist role' };
      }
      break;
    case 'ORGANIZER':
      if (!textFields[role]) {
        return { valid: false, message: 'Past event reference is required for Organizer role' };
      }
      if (!documents[role]) {
        return { valid: false, message: 'Approval letter is required for Organizer role' };
      }
      break;
    case 'STORE_OWNER':
      if (!documents[role]) {
        return { valid: false, message: 'Business license is required for Seller role' };
      }
      break;
    case 'TEACHER':
      if (!documents[role]) {
        return { valid: false, message: 'Teaching certificate is required for Teacher role' };
      }
      break;
  }
  return { valid: true };
};

// Create role request
export const createRoleRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { reason, contact } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    // Parse requested roles from body
    const requestedRoles = JSON.parse(req.body.requestedRoles || '[]');

    // Validate input
    if (!Array.isArray(requestedRoles) || requestedRoles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one role must be selected' 
      });
    }

    if (!reason || !contact) {
      return res.status(400).json({ 
        success: false, 
        error: 'Reason and contact information are required' 
      });
    }

    const validRoles = ['ARTIST', 'ORGANIZER', 'STORE_OWNER', 'TEACHER'];
    const invalidRoles = requestedRoles.filter(r => !validRoles.includes(r));
    
    if (invalidRoles.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid roles: ${invalidRoles.join(', ')}` 
      });
    }

    // Organize uploaded files
    const documents: { [key: string]: string } = {};
    const textFields: { [key: string]: string } = {};

    // Extract text fields
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('text_')) {
        const role = key.replace('text_', '');
        textFields[role] = req.body[key];
      }
    });

    // Extract documents
    if (files) {
      Object.keys(files).forEach(fieldName => {
        if (fieldName.startsWith('document_')) {
          const role = fieldName.replace('document_', '');
          const file = files[fieldName][0];
          documents[role] = `/uploads/role-documents/${file.filename}`;
        }
      });
    }

    // Validate role-specific requirements
    for (const role of requestedRoles) {
      const validation = validateRoleRequirements(role, documents, textFields);
      if (!validation.valid) {
        return res.status(400).json({ 
          success: false, 
          error: validation.message 
        });
      }
    }

    // Check for duplicate pending requests
    const existingRequests = await prisma.roleRequest.findMany({
      where: {
        userId,
        requestedRole: { in: requestedRoles },
        status: 'PENDING',
      },
    });

    if (existingRequests.length > 0) {
      const duplicateRoles = existingRequests.map(r => r.requestedRole).join(', ');
      return res.status(400).json({ 
        success: false, 
        error: `You already have pending requests for: ${duplicateRoles}` 
      });
    }

    // Create role requests (one per role)
    const createdRequests = await Promise.all(
      requestedRoles.map(role =>
        prisma.roleRequest.create({
          data: {
            userId,
            requestedRole: role as any,
            reason,
            contact,
            documents: documents[role] ? { [role]: documents[role] } : undefined,
            textFields: textFields[role] ? { [role]: textFields[role] } : undefined,
            status: 'PENDING',
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        })
      )
    );

    res.status(201).json({
      success: true,
      message: 'Role upgrade requests submitted successfully',
      data: createdRequests,
    });
  } catch (error: any) {
    console.error('Create role request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit role request' 
    });
  }
};

// Get all pending requests (Admin only)
export const getPendingRoleRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { status: 'PENDING' };
    if (role && role !== 'ALL') {
      where.requestedRole = role;
    }

    const [requests, total] = await Promise.all([
      prisma.roleRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              city: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.roleRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pending requests' 
    });
  }
};

// Get all role requests (Admin only)
export const getAllRoleRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, role } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (role && role !== 'ALL') {
      where.requestedRole = role;
    }

    const [requests, total] = await Promise.all([
      prisma.roleRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              city: true,
              role: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.roleRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get role requests error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch role requests' 
    });
  }
};

// Get single role request (Admin only)
export const getRoleRequestById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const request = await prisma.roleRequest.findUnique({
      where: { id: String(id) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            city: true,
            avatarUrl: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role request not found' 
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Get role request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch role request' 
    });
  }
};

// Approve role request (Admin only)
export const approveRoleRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const adminId = req.user?.id;

    const request = await prisma.roleRequest.findUnique({
      where: { id: String(id) },
      include: { user: true },
    });

    if (!request) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role request not found' 
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only pending requests can be approved' 
      });
    }

    // Update request status
    const updatedRequest = await prisma.roleRequest.update({
      where: { id: String(id) },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: description || null, // Store approval notes in rejectionReason field
      },
    });

    // Update user role if they don't already have it
    if (request.user && request.user.role !== request.requestedRole) {
      console.log('🔄 Updating user role from', request.user.role, 'to', request.requestedRole);
      
      await prisma.user.update({
        where: { id: request.userId },
        data: { role: request.requestedRole as any },
      });

      console.log('✅ User role updated successfully');

      // If role is ARTIST, create Artist profile automatically
      
      // If role is STORE_OWNER, create Store profile automatically
      if (request.requestedRole === 'STORE_OWNER') {
        console.log('🏪 Requested role is STORE_OWNER, checking for existing store...');
        
        const existingStore = await prisma.store.findUnique({
          where: { ownerId: request.userId }
        });

        if (!existingStore) {
          console.log('📝 Creating new store profile...');
          
          try {
            await prisma.store.create({
              data: {
                ownerId: request.userId,
                name: request.user.fullName ? `${request.user.fullName}'s Store` : 'My Store',
                description: request.reason || 'Welcome to my store!',
              }
            });
            console.log('✅ Store profile created successfully!');
          } catch (error) {
            console.error('❌ Failed to create store profile:', error);
          }
        } else {
          console.log('ℹ️ Store profile already exists, skipping creation');
        }
      }

      if (request.requestedRole === 'ARTIST') {
        console.log('🎨 Requested role is ARTIST, checking for existing profile...');
        
        // Check if artist profile already exists
        const { data: existingArtist, error: checkError } = await supabase
          .from('Artist')
          .select('id')
          .eq('userId', request.userId)
          .single();

        console.log('🔍 Existing artist check:', { 
          exists: !!existingArtist, 
          error: checkError?.message 
        });

        if (!existingArtist) {
          console.log('📝 Creating new artist profile...');
          
          // Create artist profile with data from role request
          const artistData: any = {
            id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            userId: request.userId,
            name: request.user.fullName || 'Artist',
            profession: 'Artist', // Default profession
            genre: 'General', // Default genre
            bio: request.reason || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Extract portfolio URL from textFields if available
          if (request.textFields && typeof request.textFields === 'object') {
            const textFieldsObj = request.textFields as any;
            if (textFieldsObj.ARTIST) {
              artistData.website = textFieldsObj.ARTIST;
            }
          }

          console.log('📋 Artist data to insert:', artistData);

          const { data: newArtist, error: createArtistError } = await supabase
            .from('Artist')
            .insert(artistData)
            .select()
            .single();

          if (createArtistError) {
            console.error('❌ Failed to create artist profile:', createArtistError);
          } else {
            console.log('✅ Artist profile created successfully!', newArtist);
          }
        } else {
          console.log('ℹ️ Artist profile already exists, skipping creation');
        }
      }
    }

    res.json({
      success: true,
      message: 'Role request approved successfully',
      data: updatedRequest,
    });
  } catch (error) {
    console.error('Approve role request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to approve role request' 
    });
  }
};

// Reject role request (Admin only)
export const rejectRoleRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason, description } = req.body;
    const adminId = req.user?.id;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rejection reason is required' 
      });
    }

    const request = await prisma.roleRequest.findUnique({
      where: { id: String(id) },
    });

    if (!request) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role request not found' 
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only pending requests can be rejected' 
      });
    }

    const updatedRequest = await prisma.roleRequest.update({
      where: { id: String(id) },
      data: {
        status: 'REJECTED',
        rejectionReason,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    res.json({
      success: true,
      message: 'Role request rejected successfully',
      data: updatedRequest,
    });
  } catch (error) {
    console.error('Reject role request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reject role request' 
    });
  }
};

// Get my role requests (User)
export const getMyRoleRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const requests = await prisma.roleRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch your role requests' 
    });
  }
};
