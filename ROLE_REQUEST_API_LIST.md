# Role Request API Endpoints

## File Locations
- **Routes Definition**: `src/routes/roleApplication.routes.ts`
- **Controller Functions**: `src/controllers/roleApplication.controller.ts`
- **Middleware**: `src/middleware/auth.middleware.ts`

## Base URL
```
http://localhost:3001/api/role-requests
```

## Endpoints List

### 1. Apply for Role (User) 
```
POST /api/role-requests/apply
```
### 2. Get My Role Requests (User)
```
GET /api/role-requests/my-requests
```
### 3. Get Pending Role Requests (Admin)
```
GET /api/role-requests/pending
```
### 4. Get All Role Requests (Admin)
```
GET /api/role-requests/all
Query Parameters: ?status=PENDING&requestedRole=ARTIST
```
### 5. Get Single Role Request (Admin)
```
GET /api/role-requests/:id
```
### 6. Approve Role Request (Admin)
```
PATCH /api/role-requests/:id/approve
```
### 7. Reject Role Request (Admin)
```
PATCH /api/role-requests/:id/reject
```
---

## Quick Reference

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/apply` | User | Submit new role request |
| GET | `/my-requests` | User | View own requests |
| GET | `/pending` | Admin | View pending requests |
| GET | `/all` | Admin | View all requests (filterable) |
| GET | `/:id` | Admin | View single request |
| PATCH | `/:id/approve` | Admin | Approve request |
| PATCH | `/:id/reject` | Admin | Reject request |

---

## Admin View: Data Details

### When Admin Gets All Applications (GET /all)

**Application Data Returned:**
- `id` - Application ID
- `userId` - Applicant's User ID
- `role` - Requested role (ARTIST or ORGANIZER)
- `status` - Application status (PENDING, APPROVED, REJECTED)
- `bio` - Applicant's bio/description
- `portfolioUrl` - Link to applicant's portfolio
- `proofDocumentUrl` - Link to uploaded proof document
- `notes` - Admin notes or rejection reason
- `createdAt` - Application submission date
- `updatedAt` - Last update date

**User Details (included with each application):**
- `id` - User ID
- `email` - User's email
- `fullName` - User's full name
- `role` - User's current role

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "app_id",
      "userId": "user_id",
      "role": "ARTIST",
      "status": "PENDING",
      "bio": "I am a traditional dancer...",
      "portfolioUrl": "https://...",
      "proofDocumentUrl": "https://...",
      "notes": null,
      "createdAt": "2026-02-12T10:30:00Z",
      "updatedAt": "2026-02-12T10:30:00Z",
      "user": {
        "id": "user_id",
        "email": "artist@example.com",
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

### When Admin Gets Single Application (GET /:id)

**Application Data:** Same as above

**Extended User Details:**
- `id` - User ID
- `email` - User's email
- `fullName` - Full name
- `firstName` - First name
- `lastName` - Last name
- `phone` - Phone number
- `city` - City/location
- `avatarUrl` - Profile picture URL
- `role` - Current user role
- `createdAt` - User account creation date
- `updatedAt` - User account last update

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "app_id",
    "userId": "user_id",
    "role": "ARTIST",
    "status": "PENDING",
    "bio": "I am a traditional dancer...",
    "portfolioUrl": "https://...",
    "proofDocumentUrl": "https://...",
    "notes": null,
    "createdAt": "2026-02-12T10:30:00Z",
    "updatedAt": "2026-02-12T10:30:00Z",
    "user": {
      "id": "user_id",
      "email": "artist@example.com",
      "fullName": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+94771234567",
      "city": "Colombo",
      "avatarUrl": "https://...",
      "role": "USER",
      "createdAt": "2026-01-15T08:00:00Z",
      "updatedAt": "2026-02-10T12:00:00Z"
    }
  }
}
```

---

## Key Features

- **Pagination**: Default 10 items per page (customizable with `?page=1&limit=20`)
- **Filtering**: Filter by status (`?status=PENDING`)
- **Sorting**: Applications ordered by most recent first
- **User Details**: List view shows basic info, detail view shows complete profile
