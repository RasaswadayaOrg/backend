# Complete API Documentation - Role Application & User Management

This document contains all API endpoints for role application management and user details with role request information.

## Base URL
```
http://localhost:3001
```

## Authentication
All endpoints require Bearer Token authentication (Admin role required).

**Header Format:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📋 Table of Contents

1. [User Management APIs](#user-management-apis)
2. [Role Application APIs](#role-application-apis)
3. [Authentication APIs](#authentication-apis)
4. [Testing Examples](#testing-examples)

---

## User Management APIs

### 1. Get All Users (with Role Applications)

**Endpoint:** `GET /api/users`

**Description:** Retrieves a paginated list of all users with their role application history.

**Authentication:** Required (Admin only)

**Query Parameters:**
- `page` (number, optional, default: 1): Page number
- `limit` (number, optional, default: 20): Items per page
- `role` (string, optional): Filter by user role (USER, ARTIST, ORGANIZER, STORE_OWNER, ADMIN)
- `search` (string, optional): Search by full name or email

**Example Requests:**
```
GET /api/users
GET /api/users?page=1&limit=10
GET /api/users?role=USER
GET /api/users?search=john
GET /api/users?role=USER&search=artist&page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cml6szjne0000bwbakrzffcir",
      "email": "user@example.com",
      "fullName": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+94771234567",
      "city": "Colombo",
      "role": "USER",
      "createdAt": "2026-02-03T16:18:42.399Z",
      "roleApplications": [
        {
          "id": "cml6t15n90002bwbank1vpkto",
          "role": "ARTIST",
          "status": "PENDING",
          "bio": "Professional Kandyan dancer with 10 years experience",
          "portfolioUrl": "https://portfolio.example.com",
          "proofDocumentUrl": "https://storage.supabase.co/.../certificate.pdf",
          "notes": null,
          "createdAt": "2026-02-03T16:19:59.061Z",
          "updatedAt": "2026-02-03T16:19:59.061Z"
        }
      ]
    },
    {
      "id": "user456",
      "email": "jane@example.com",
      "fullName": "Jane Smith",
      "role": "ARTIST",
      "roleApplications": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 2. Get User by ID (Detailed)

**Endpoint:** `GET /api/users/:id`

**Description:** Retrieves detailed information about a specific user including artist profile, orders, preferences, and role applications.

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` (string, required): User ID

**Example Request:**
```
GET /api/users/cml6szjne0000bwbakrzffcir
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cml6szjne0000bwbakrzffcir",
      "email": "user@example.com",
      "fullName": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+94771234567",
      "city": "Colombo",
      "avatarUrl": "https://example.com/avatar.jpg",
      "role": "USER",
      "createdAt": "2026-02-03T16:18:42.399Z"
    },
    "artistProfile": {
      "id": "artist123",
      "name": "John Doe",
      "profession": "Kandyan Dancer",
      "bio": "...",
      "imageUrl": "..."
    },
    "orders": [
      {
        "id": "order123",
        "totalAmount": 5000,
        "status": "PAID",
        "createdAt": "2026-02-01T10:00:00.000Z"
      }
    ],
    "preferences": {
      "id": "pref123",
      "categories": ["Dance", "Music"],
      "interests": ["Kandyan", "Traditional"]
    },
    "roleApplications": [
      {
        "id": "app123",
        "role": "ARTIST",
        "bio": "Professional dancer...",
        "portfolioUrl": "https://...",
        "proofDocumentUrl": "https://...",
        "status": "PENDING",
        "createdAt": "2026-02-03T16:19:59.061Z",
        "updatedAt": "2026-02-03T16:19:59.061Z"
      }
    ]
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 3. Update User Role

**Endpoint:** `PUT /api/users/:id/role`

**Description:** Updates a user's role (manual role assignment).

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` (string, required): User ID

**Request Body:**
```json
{
  "role": "ARTIST"
}
```

**Valid Roles:**
- `USER`
- `ARTIST`
- `ORGANIZER`
- `STORE_OWNER`
- `ADMIN`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User role updated",
  "data": {
    "id": "user123",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "ARTIST"
  }
}
```

---

### 4. Delete User

**Endpoint:** `DELETE /api/users/:id`

**Description:** Deletes a user and their related data.

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` (string, required): User ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Cannot delete your own account"
}
```

---

## Role Application APIs

### 5. Get All Role Applications

**Endpoint:** `GET /api/role-applications/all`

**Description:** Retrieves a paginated list of all role applications with basic user information.

**Authentication:** Required (Admin only)

**Query Parameters:**
- `status` (string, optional): Filter by status (PENDING, APPROVED, REJECTED, ALL)
- `page` (number, optional, default: 1): Page number
- `limit` (number, optional, default: 10): Items per page

**Example Requests:**
```
GET /api/role-applications/all
GET /api/role-applications/all?status=PENDING
GET /api/role-applications/all?status=APPROVED&page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cml6t15n90002bwbank1vpkto",
      "userId": "cml6szjne0000bwbakrzffcir",
      "role": "ARTIST",
      "status": "PENDING",
      "bio": "Professional Kandyan dancer with 10 years experience",
      "portfolioUrl": "https://portfolio.example.com",
      "proofDocumentUrl": "https://storage.supabase.co/.../certificate.pdf",
      "notes": null,
      "createdAt": "2026-02-03T16:19:59.061Z",
      "updatedAt": "2026-02-03T16:19:59.061Z",
      "user": {
        "id": "cml6szjne0000bwbakrzffcir",
        "email": "user@example.com",
        "fullName": "John Doe",
        "role": "USER"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### 6. Get Single Role Application (with Full User Details)

**Endpoint:** `GET /api/role-applications/:id`

**Description:** Retrieves detailed information about a specific role application including complete user profile.

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` (string, required): Application ID

**Example Request:**
```
GET /api/role-applications/cml6t15n90002bwbank1vpkto
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cml6t15n90002bwbank1vpkto",
    "userId": "cml6szjne0000bwbakrzffcir",
    "role": "ARTIST",
    "status": "PENDING",
    "bio": "Professional Kandyan dancer with 10 years experience...",
    "portfolioUrl": "https://portfolio.example.com",
    "proofDocumentUrl": "https://storage.supabase.co/.../certificate.pdf",
    "notes": null,
    "createdAt": "2026-02-03T16:19:59.061Z",
    "updatedAt": "2026-02-03T16:19:59.061Z",
    "user": {
      "id": "cml6szjne0000bwbakrzffcir",
      "email": "user@example.com",
      "fullName": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+94771234567",
      "city": "Colombo",
      "avatarUrl": "https://example.com/avatar.jpg",
      "role": "USER",
      "createdAt": "2026-01-15T08:00:00.000Z",
      "updatedAt": "2026-02-03T16:18:42.399Z"
    }
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Application not found"
}
```

---

### 7. Approve Role Application

**Endpoint:** `PUT /api/role-applications/:id/status`

**Description:** Approves a role application and automatically updates the user's role.

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` (string, required): Application ID

**Request Body:**
```json
{
  "status": "APPROVED"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Application approved successfully",
  "data": {
    "id": "cml6t15n90002bwbank1vpkto",
    "userId": "cml6szjne0000bwbakrzffcir",
    "role": "ARTIST",
    "status": "APPROVED",
    "bio": "Professional Kandyan dancer...",
    "portfolioUrl": "https://portfolio.example.com",
    "proofDocumentUrl": "https://storage.supabase.co/.../certificate.pdf",
    "notes": null,
    "createdAt": "2026-02-03T16:19:59.061Z",
    "updatedAt": "2026-02-05T14:20:00.000Z"
  }
}
```

**Note:** When approved, the user's role in the User table is automatically updated to match the application role.

---

### 8. Reject Role Application (with Reason)

**Endpoint:** `PUT /api/role-applications/:id/status`

**Description:** Rejects a role application with a mandatory reject reason.

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` (string, required): Application ID

**Request Body:**
```json
{
  "status": "REJECTED",
  "rejectReason": "Insufficient documentation. Please provide valid proof of professional experience and official certifications."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Application rejected successfully",
  "data": {
    "id": "cml6t15n90002bwbank1vpkto",
    "userId": "cml6szjne0000bwbakrzffcir",
    "role": "ARTIST",
    "status": "REJECTED",
    "bio": "Professional Kandyan dancer...",
    "portfolioUrl": "https://portfolio.example.com",
    "proofDocumentUrl": "https://storage.supabase.co/.../certificate.pdf",
    "notes": "Insufficient documentation. Please provide valid proof of professional experience and official certifications.",
    "createdAt": "2026-02-03T16:19:59.061Z",
    "updatedAt": "2026-02-05T14:25:00.000Z"
  }
}
```

**Response (400 Bad Request - Missing Reason):**
```json
{
  "success": false,
  "error": "Reject reason is required when rejecting an application."
}
```

**Response (400 Bad Request - Already Processed):**
```json
{
  "success": false,
  "error": "Only pending applications can be updated"
}
```

---

### 9. Submit Role Application (User Endpoint)

**Endpoint:** `POST /api/role-applications/apply`

**Description:** Allows a user to submit a role application.

**Authentication:** Required (Authenticated user)

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `role` (string, required): Role to apply for (ARTIST, ORGANIZER)
- `bio` (string, optional): User's bio
- `portfolioUrl` (string, optional): Portfolio URL
- `proofDocument` (file, optional): Proof document (PDF/Image, max 5MB)

**Example Request (using form-data):**
```
POST /api/role-applications/apply
Content-Type: multipart/form-data

role=ARTIST
bio=Professional Kandyan dancer with 10 years experience
portfolioUrl=https://portfolio.example.com
proofDocument=[file]
```

**Response (201 Created):**
```json
{
  "id": "cml6t15n90002bwbank1vpkto",
  "userId": "cml6szjne0000bwbakrzffcir",
  "role": "ARTIST",
  "status": "PENDING",
  "bio": "Professional Kandyan dancer with 10 years experience",
  "portfolioUrl": "https://portfolio.example.com",
  "proofDocumentUrl": "https://storage.supabase.co/.../document.pdf",
  "notes": null,
  "createdAt": "2026-02-03T16:19:59.061Z",
  "updatedAt": "2026-02-03T16:19:59.061Z"
}
```

---

### 10. Get My Applications (User Endpoint)

**Endpoint:** `GET /api/role-applications/my-applications`

**Description:** Retrieves all role applications submitted by the authenticated user.

**Authentication:** Required (Authenticated user)

**Response (200 OK):**
```json
[
  {
    "id": "cml6t15n90002bwbank1vpkto",
    "userId": "cml6szjne0000bwbakrzffcir",
    "role": "ARTIST",
    "status": "PENDING",
    "bio": "Professional Kandyan dancer...",
    "portfolioUrl": "https://portfolio.example.com",
    "proofDocumentUrl": "https://storage.supabase.co/.../document.pdf",
    "notes": null,
    "createdAt": "2026-02-03T16:19:59.061Z",
    "updatedAt": "2026-02-03T16:19:59.061Z"
  }
]
```

---

## Authentication APIs

### 11. Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticates a user and returns a JWT token.

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "mt2ml2zum9rvs15m6j1nyd60",
      "email": "admin@example.com",
      "fullName": "Administrator",
      "role": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

## Testing Examples

### Postman Collection Setup

#### 1. Environment Variables
Create these variables:
- `baseUrl`: `http://localhost:3001`
- `adminToken`: Your admin JWT token

#### 2. Collection Structure

**Folder: Authentication**
- POST Login

**Folder: User Management**
- GET All Users
- GET User by ID
- PUT Update User Role
- DELETE Delete User

**Folder: Role Applications (Admin)**
- GET All Applications
- GET Application by ID
- PUT Approve Application
- PUT Reject Application

**Folder: Role Applications (User)**
- POST Submit Application
- GET My Applications

---

### cURL Examples

#### Get All Users with Role Applications
```bash
curl -X GET "http://localhost:3001/api/users?limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Get Specific User Details
```bash
curl -X GET "http://localhost:3001/api/users/cml6szjne0000bwbakrzffcir" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Get All Pending Applications
```bash
curl -X GET "http://localhost:3001/api/role-applications/all?status=PENDING" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Get Application Details
```bash
curl -X GET "http://localhost:3001/api/role-applications/cml6t15n90002bwbank1vpkto" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Approve Application
```bash
curl -X PUT "http://localhost:3001/api/role-applications/cml6t15n90002bwbank1vpkto/status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED"
  }'
```

#### Reject Application with Reason
```bash
curl -X PUT "http://localhost:3001/api/role-applications/cml6t15n90002bwbank1vpkto/status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REJECTED",
    "rejectReason": "Insufficient documentation provided. Please submit valid proof of professional experience."
  }'
```

#### Submit Role Application (User)
```bash
curl -X POST "http://localhost:3001/api/role-applications/apply" \
  -H "Authorization: Bearer USER_TOKEN" \
  -F "role=ARTIST" \
  -F "bio=Professional Kandyan dancer with 10 years experience" \
  -F "portfolioUrl=https://portfolio.example.com" \
  -F "proofDocument=@/path/to/certificate.pdf"
```

#### Get My Applications (User)
```bash
curl -X GET "http://localhost:3001/api/role-applications/my-applications" \
  -H "Authorization: Bearer USER_TOKEN"
```

---

## Error Responses

### Common Error Codes

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Access denied. Admin role required."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Resource not found"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation error message"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Database Schema Reference

### User Model
```typescript
{
  id: string
  email: string
  password: string
  fullName: string
  firstName?: string
  lastName?: string
  phone?: string
  city?: string
  avatarUrl?: string
  role: UserRole // USER, ARTIST, ORGANIZER, STORE_OWNER, ADMIN
  createdAt: DateTime
  updatedAt: DateTime
}
```

### RoleApplication Model
```typescript
{
  id: string
  userId: string
  role: UserRole // ARTIST, ORGANIZER
  status: ApplicationStatus // PENDING, APPROVED, REJECTED
  bio?: string
  portfolioUrl?: string
  proofDocumentUrl?: string
  notes?: string // Reject reason stored here
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## Workflow Summary

### User Role Application Workflow

1. **User Submits Application**
   - POST `/api/role-applications/apply`
   - Status: PENDING
   - User can upload proof documents

2. **Admin Reviews Application**
   - GET `/api/users` (see all users with pending applications)
   - GET `/api/role-applications/:id` (view detailed application)

3. **Admin Makes Decision**
   - **Approve**: PUT `/api/role-applications/:id/status` with `status: "APPROVED"`
     - User role automatically updated
   - **Reject**: PUT `/api/role-applications/:id/status` with `status: "REJECTED"` and `rejectReason`
     - User role remains unchanged
     - Reject reason stored in `notes` field

4. **User Checks Status**
   - GET `/api/role-applications/my-applications`
   - Can see status and reject reason if rejected

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- JWT tokens expire after 24 hours
- File uploads limited to 5MB
- Pagination defaults: page=1, limit=10-20 depending on endpoint
- Only PENDING applications can be approved/rejected
- Reject reason is mandatory when rejecting
- When approving, user role is automatically updated
- Users cannot delete their own accounts
- All admin endpoints require ADMIN role

---

## Support

For issues or questions, refer to the backend repository:
- Repository: RasaswadayaOrg/backend
- Branch: PasinduMadushan

Last Updated: February 11, 2026
