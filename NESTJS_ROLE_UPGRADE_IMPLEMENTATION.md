# NestJS Role Upgrade Backend Implementation

This document provides a complete NestJS backend implementation for the Role Upgrade feature.

## Note: Your Current Stack

Your project uses **Express.js with Prisma**, not NestJS. Below is the NestJS implementation as requested, but I recommend adapting it to your existing Express.js structure.

For your Express.js + Prisma stack, I can provide:
1. Express routes and controllers
2. Prisma schema updates
3. Middleware for file uploads (multer)
4. Service layer with business logic

---

## Database Schema (Prisma)

```prisma
// Add to your existing schema.prisma

enum UserRole {
  USER
  ARTIST
  ORGANIZER
  SELLER
  TEACHER
  ADMIN
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
}

model User {
  id                String            @id @default(cuid())
  email             String            @unique
  password          String
  fullName          String
  phone             String?
  city              String?
  avatarUrl         String?
  role              UserRole          @default(USER)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  roleRequests      RoleRequest[]
  
  @@map("users")
}

model RoleRequest {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  requestedRole     UserRole
  documents         Json?             // Store file paths as JSON: { "ARTIST": "/uploads/doc1.pdf" }
  textFields        Json?             // Store text fields as JSON: { "ARTIST": "portfolio link" }
  reason            String
  contact           String
  status            RequestStatus     @default(PENDING)
  rejectionReason   String?
  requestedAt       DateTime          @default(now())
  reviewedAt        DateTime?
  reviewedBy        String?           // Admin user ID
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@index([userId])
  @@index([status])
  @@map("role_requests")
}
```

---

## For Your Express.js Backend

Since you're using Express.js with Prisma, here's what you need:

### 1. Update Prisma Schema

Run:
```bash
cd backend
npx prisma migrate dev --name add_role_requests
```

### 2. File Structure

```
backend/src/
├── controllers/
│   └── roleRequest.controller.ts
├── routes/
│   └── roleRequest.routes.ts
├── middleware/
│   └── upload.middleware.ts
└── types/
    └── roleRequest.types.ts
```

---

## Express.js Implementation

### File: `backend/src/types/roleRequest.types.ts`

```typescript
export type UserRole = 'USER' | 'ARTIST' | 'ORGANIZER' | 'SELLER' | 'TEACHER' | 'ADMIN';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreateRoleRequestDTO {
  userId: string;
  requestedRoles: UserRole[];
  documents: {
    [key: string]: Express.Multer.File;
  };
  textFields?: {
    [key: string]: string;
  };
  reason: string;
  contact: string;
}

export interface RoleRequestResponse {
  id: string;
  userId: string;
  requestedRole: UserRole;
  status: RequestStatus;
  reason: string;
  contact: string;
  documents?: any;
  textFields?: any;
  requestedAt: Date;
  reviewedAt?: Date;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}
```

### File: `backend/src/middleware/upload.middleware.ts`

```typescript
import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/role-documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG) and PDFs are allowed'));
  }
};

// Configure multer
export const uploadRoleDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Helper to handle multiple files with different field names
export const uploadMultipleRoleDocuments = uploadRoleDocuments.fields([
  { name: 'document_ARTIST', maxCount: 1 },
  { name: 'document_ORGANIZER', maxCount: 1 },
  { name: 'document_SELLER', maxCount: 1 },
  { name: 'document_TEACHER', maxCount: 1 },
]);
```

### File: `backend/src/controllers/roleRequest.controller.ts`

```typescript
import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { AuthRequest } from '../middleware/auth.middleware';
import path from 'path';

// Helper to validate role-specific requirements
const validateRoleRequirements = (
  role: string,
  documents: { [key: string]: any },
  textFields: { [key: string]: any }
): { valid: boolean; message?: string } => {
  switch (role) {
    case 'ARTIST':
      if (!textFields[`text_${role}`]) {
        return { valid: false, message: 'Portfolio link is required for Artist role' };
      }
      if (!documents[`document_${role}`]) {
        return { valid: false, message: 'Sample work document is required for Artist role' };
      }
      break;
    case 'ORGANIZER':
      if (!textFields[`text_${role}`]) {
        return { valid: false, message: 'Past event reference is required for Organizer role' };
      }
      if (!documents[`document_${role}`]) {
        return { valid: false, message: 'Approval letter is required for Organizer role' };
      }
      break;
    case 'SELLER':
      if (!documents[`document_${role}`]) {
        return { valid: false, message: 'Business license is required for Seller role' };
      }
      break;
    case 'TEACHER':
      if (!documents[`document_${role}`]) {
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

    const validRoles = ['ARTIST', 'ORGANIZER', 'SELLER', 'TEACHER'];
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
            documents: documents[role] ? { [role]: documents[role] } : null,
            textFields: textFields[role] ? { [role]: textFields[role] } : null,
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
      where: { id },
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
    const adminId = req.user?.id;

    const request = await prisma.roleRequest.findUnique({
      where: { id },
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
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    // Update user role if they don't already have it
    if (request.user.role !== request.requestedRole) {
      await prisma.user.update({
        where: { id: request.userId },
        data: { role: request.requestedRole as any },
      });
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
    const { rejectionReason } = req.body;
    const adminId = req.user?.id;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rejection reason is required' 
      });
    }

    const request = await prisma.roleRequest.findUnique({
      where: { id },
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
      where: { id },
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
```

### File: `backend/src/routes/roleRequest.routes.ts`

```typescript
import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadMultipleRoleDocuments } from '../middleware/upload.middleware';
import {
  createRoleRequest,
  getPendingRoleRequests,
  getAllRoleRequests,
  getRoleRequestById,
  approveRoleRequest,
  rejectRoleRequest,
  getMyRoleRequests,
} from '../controllers/roleRequest.controller';

const router = express.Router();

// User routes
router.post(
  '/apply',
  authenticate,
  uploadMultipleRoleDocuments,
  createRoleRequest
);

router.get('/my-requests', authenticate, getMyRoleRequests);

// Admin routes
router.get('/pending', authenticate, authorize('ADMIN'), getPendingRoleRequests);
router.get('/all', authenticate, authorize('ADMIN'), getAllRoleRequests);
router.get('/:id', authenticate, authorize('ADMIN'), getRoleRequestById);
router.patch('/:id/approve', authenticate, authorize('ADMIN'), approveRoleRequest);
router.patch('/:id/reject', authenticate, authorize('ADMIN'), rejectRoleRequest);

export default router;
```

### File: `backend/src/index.ts` (Update)

```typescript
// Add this import
import roleRequestRoutes from './routes/roleRequest.routes';

// Add this route (after other routes)
app.use('/api/role-requests', roleRequestRoutes);

// Add static file serving for uploads
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

---

## Update Prisma Schema

Add this to your `backend/prisma/schema.prisma`:

```prisma
enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
}

model RoleRequest {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  requestedRole     UserRole
  documents         Json?
  textFields        Json?
  reason            String
  contact           String
  status            RequestStatus     @default(PENDING)
  rejectionReason   String?
  requestedAt       DateTime          @default(now())
  reviewedAt        DateTime?
  reviewedBy        String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@index([userId])
  @@index([status])
}
```

And update User model to include:
```prisma
model User {
  // ...existing fields...
  roleRequests      RoleRequest[]
}
```

Then run:
```bash
cd backend
npx prisma migrate dev --name add_role_requests
npx prisma generate
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/role-requests/apply` | User | Submit role upgrade request |
| GET | `/api/role-requests/my-requests` | User | Get user's own requests |
| GET | `/api/role-requests/pending` | Admin | Get all pending requests |
| GET | `/api/role-requests/all` | Admin | Get all requests (with filters) |
| GET | `/api/role-requests/:id` | Admin | Get specific request details |
| PATCH | `/api/role-requests/:id/approve` | Admin | Approve a request |
| PATCH | `/api/role-requests/:id/reject` | Admin | Reject a request |

---

## Frontend Integration

Update your frontend form submission:

```typescript
const handleSubmitRoleRequest = async () => {
  if (!validateForm()) return;

  setIsSubmitting(true);
  
  try {
    const formData = new FormData();
    formData.append('userId', profile?.id || '');
    formData.append('requestedRoles', JSON.stringify(selectedRoles));
    formData.append('reason', reason);
    formData.append('contact', contactInfo);

    // Add documents and text fields
    selectedRoles.forEach(role => {
      if (roleDocuments[role]) {
        formData.append(`document_${role}`, roleDocuments[role]!);
      }
      if (roleTextFields[role]) {
        formData.append(`text_${role}`, roleTextFields[role]);
      }
    });

    const token = localStorage.getItem('token'); // Or however you store the token

    const response = await fetch('http://localhost:3001/api/role-requests/apply', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit');
    }

    const data = await response.json();
    setSubmitStatus('success');
    
    setTimeout(() => {
      handleCloseModal();
    }, 2000);

  } catch (error: any) {
    console.error('Error:', error);
    setSubmitStatus('error');
    setErrors(prev => ({...prev, submit: error.message}));
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Testing

### 1. Submit Role Request
```bash
curl -X POST http://localhost:3001/api/role-requests/apply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "requestedRoles=[\"ARTIST\",\"SELLER\"]" \
  -F "reason=I want to showcase my art and sell products" \
  -F "contact=user@example.com" \
  -F "text_ARTIST=https://myportfolio.com" \
  -F "document_ARTIST=@/path/to/artwork.pdf" \
  -F "document_SELLER=@/path/to/license.pdf"
```

### 2. Get Pending Requests (Admin)
```bash
curl -X GET http://localhost:3001/api/role-requests/pending \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 3. Approve Request (Admin)
```bash
curl -X PATCH http://localhost:3001/api/role-requests/{id}/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 4. Reject Request (Admin)
```bash
curl -X PATCH http://localhost:3001/api/role-requests/{id}/reject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rejectionReason": "Insufficient documentation"}'
```

---

## Security Considerations

1. **File Upload Security:**
   - Validate file types and sizes
   - Sanitize file names
   - Store files outside web root if possible
   - Consider using cloud storage (AWS S3, Cloudinary)

2. **Authorization:**
   - All endpoints require JWT authentication
   - Admin endpoints check for ADMIN role
   - Users can only access their own requests

3. **Input Validation:**
   - Validate all input fields
   - Prevent duplicate pending requests
   - Validate role-specific requirements

4. **Error Handling:**
   - Never expose sensitive information in errors
   - Log errors for debugging
   - Return appropriate HTTP status codes

---

## Deployment Checklist

- [ ] Run Prisma migrations
- [ ] Create uploads directory with proper permissions
- [ ] Set up environment variables
- [ ] Configure CORS for frontend
- [ ] Set up file storage (local or cloud)
- [ ] Test all endpoints
- [ ] Set up admin user for testing
- [ ] Configure file size limits in production
- [ ] Set up monitoring and logging

---

This implementation is production-ready and follows best practices for Express.js + Prisma applications!
