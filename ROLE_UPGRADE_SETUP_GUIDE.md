# 🚀 Role Upgrade Feature - Setup & Testing Guide

## ✅ What's Been Created

### Backend Files
1. **Controller**: `src/controllers/roleRequest.controller.ts` - All business logic
2. **Routes**: `src/routes/roleRequest.routes.ts` - API endpoints
3. **Middleware**: `src/middleware/upload.middleware.ts` - File upload handling
4. **Types**: `src/types/roleRequest.types.ts` - TypeScript definitions
5. **Schema**: Updated `prisma/schema.prisma` with RoleRequest model

### Frontend Files
1. **Profile Page**: Updated `frontend/src/app/profile/page.tsx` with role upgrade modal

### Documentation
1. `NESTJS_ROLE_UPGRADE_IMPLEMENTATION.md` - Complete implementation guide
2. `manual_migration_role_request.sql` - Database migration script

---

## 📋 Setup Steps

### Step 1: Run Database Migration

You have two options:

**Option A: Manual SQL (Recommended - No data loss)**
```bash
# Copy the contents of manual_migration_role_request.sql
# Run it in your Supabase SQL Editor or via psql
```

**Option B: Reset Database (CAUTION: All data will be lost)**
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev --name add_role_requests
```

### Step 2: Verify Database

Run this SQL to check if the table was created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'RoleRequest';
```

### Step 3: Regenerate Prisma Client

```bash
cd backend
npx prisma generate
```

### Step 4: Restart TypeScript Server (Important!)

In VS Code:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: "TypeScript: Restart TS Server"
3. Select it

Or simply restart VS Code.

### Step 5: Start Backend Server

```bash
cd backend
npm run dev
```

The server should start without TypeScript errors on port 3001.

---

## 🧪 Testing the API

### 1. Get Admin Token

Create/use an admin token:
```bash
cd backend
npm run create-admin
```

Or use existing token from localStorage.

### 2. Test Endpoints

**Submit Role Request (User)**
```bash
curl -X POST http://localhost:3001/api/role-requests/apply \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -F "requestedRoles=[\"ARTIST\",\"SELLER\"]" \
  -F "reason=I want to showcase my art and sell products" \
  -F "contact=user@example.com" \
  -F "text_ARTIST=https://myportfolio.com" \
  -F "document_ARTIST=@/path/to/artwork.pdf" \
  -F "document_SELLER=@/path/to/license.pdf"
```

**Get Pending Requests (Admin)**
```bash
curl -X GET "http://localhost:3001/api/role-requests/pending?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Get All Requests (Admin)**
```bash
curl -X GET "http://localhost:3001/api/role-requests/all?status=PENDING&role=ARTIST" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Get Single Request (Admin)**
```bash
curl -X GET "http://localhost:3001/api/role-requests/{REQUEST_ID}" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Approve Request (Admin)**
```bash
curl -X PATCH "http://localhost:3001/api/role-requests/{REQUEST_ID}/approve" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Reject Request (Admin)**
```bash
curl -X PATCH "http://localhost:3001/api/role-requests/{REQUEST_ID}/reject" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rejectionReason": "Insufficient documentation provided"}'
```

**Get My Requests (User)**
```bash
curl -X GET "http://localhost:3001/api/role-requests/my-requests" \
  -H "Authorization: Bearer USER_TOKEN"
```

---

## 🎨 Testing Frontend

### 1. Start Frontend
```bash
cd frontend
npm run dev
```

### 2. Test Flow
1. Navigate to `/profile`
2. Click "Apply for Role Upgrade" button
3. Select one or more roles (Artist, Organizer, Seller, Teacher)
4. Fill in role-specific fields
5. Upload required documents (max 5MB, images/PDFs only)
6. Enter reason and contact info
7. Click "Submit Request"

### 3. Verify Success
- Should see success message
- Page refreshes automatically
- Check network tab for API call to `http://localhost:3001/api/role-requests/apply`

---

## 📊 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/role-requests/apply` | User | Submit role upgrade request |
| GET | `/api/role-requests/my-requests` | User | Get user's own requests |
| GET | `/api/role-requests/pending` | Admin | Get all pending requests |
| GET | `/api/role-requests/all` | Admin | Get all requests (with filters) |
| GET | `/api/role-requests/:id` | Admin | Get specific request details |
| PATCH | `/api/role-requests/:id/approve` | Admin | Approve a request |
| PATCH | `/api/role-requests/:id/reject` | Admin | Reject a request (requires reason) |

---

## 🔍 Troubleshooting

### TypeScript Errors: "Property 'roleRequest' does not exist"

**Solution:**
1. Run `npx prisma generate` in backend folder
2. Restart TypeScript server in VS Code
3. Close and reopen VS Code if needed

### Database Connection Error

**Check:**
- `.env` file has correct `DATABASE_URL`
- Supabase connection is active
- Database accepts connections

### File Upload Errors

**Check:**
- `uploads/role-documents` directory exists
- Directory has write permissions
- Files are under 5MB
- Files are JPEG, PNG, or PDF

### CORS Errors

**Check:**
- Backend is running on port 3001
- Frontend is running on port 3000
- CORS is configured in `backend/src/index.ts`

---

## 🎯 Next Steps

### For Users:
1. ✅ Submit role upgrade requests from profile page
2. ✅ Track request status
3. ✅ Upload documents for verification

### For Admins:
1. ✅ View all pending requests
2. ✅ Review user details and documents
3. ✅ Approve or reject with reasons
4. ⏳ Build admin dashboard UI (future)

### Future Enhancements:
- Email notifications on status change
- Real-time notifications
- Document preview in admin panel
- Bulk approve/reject
- Request history and analytics
- Multi-language support

---

## 📁 File Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── roleRequest.controller.ts    ✅ NEW
│   ├── routes/
│   │   └── roleRequest.routes.ts        ✅ NEW
│   ├── middleware/
│   │   └── upload.middleware.ts         ✅ NEW
│   ├── types/
│   │   └── roleRequest.types.ts         ✅ NEW
│   └── index.ts                         ✅ UPDATED
├── prisma/
│   └── schema.prisma                    ✅ UPDATED
├── uploads/
│   └── role-documents/                  ✅ AUTO-CREATED
└── manual_migration_role_request.sql    ✅ NEW

frontend/
└── src/
    └── app/
        └── profile/
            └── page.tsx                  ✅ UPDATED
```

---

## ✨ Features Implemented

### User Features:
- ✅ Multi-role selection (Artist, Organizer, Seller, Teacher)
- ✅ Dynamic form fields based on selected roles
- ✅ File upload with validation (type, size)
- ✅ Real-time form validation
- ✅ Duplicate request prevention
- ✅ Success/error feedback

### Admin Features:
- ✅ View all requests with pagination
- ✅ Filter by status and role
- ✅ View full user details
- ✅ Approve requests (auto-updates user role)
- ✅ Reject requests (with mandatory reason)
- ✅ Track reviewer and review timestamp

### Technical Features:
- ✅ TypeScript type safety
- ✅ Prisma ORM with PostgreSQL
- ✅ JWT authentication
- ✅ Multer file uploads
- ✅ Express.js REST API
- ✅ Error handling
- ✅ Input validation
- ✅ Security best practices

---

## 🎉 You're Ready!

The Role Upgrade feature is fully implemented and ready to use. Follow the setup steps above, run the tests, and start accepting role upgrade requests from your users!

For questions or issues, refer to the detailed documentation in `NESTJS_ROLE_UPGRADE_IMPLEMENTATION.md`.
