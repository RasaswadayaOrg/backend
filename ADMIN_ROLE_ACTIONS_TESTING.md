# Admin Role Application Actions - Testing Guide

## Overview
This document provides step-by-step instructions for testing admin actions on role applications using POST requests.

---

## Base URL
```
http://localhost:3001/api/role-applications
```

---

## Prerequisites

### 1. Get Admin Token
First, you need an admin account and token. Login as admin:

**POST** `http://localhost:3001/api/auth/login`

```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin_user_id",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

Copy the token - you'll use it in all admin requests.

---

## Admin Endpoints

### 1. Get Pending Applications (Read)

**GET** `http://localhost:3001/api/role-applications/pending`

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Query Parameters (Optional):**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Example:**
```
GET http://localhost:3001/api/role-applications/pending?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cm5abcd123",
      "userId": "user123",
      "role": "ARTIST",
      "status": "PENDING",
      "bio": "I am a traditional Kandyan dancer...",
      "portfolioUrl": "https://portfolio.com/user",
      "proofDocumentUrl": "https://storage.supabase.co/...",
      "notes": null,
      "createdAt": "2026-02-12T10:00:00Z",
      "updatedAt": "2026-02-12T10:00:00Z",
      "user": {
        "id": "user123",
        "email": "artist@example.com",
        "fullName": "Nimal Perera",
        "role": "USER"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 2. Get Single Application Details

**GET** `http://localhost:3001/api/role-applications/:id`

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Example:**
```
GET http://localhost:3001/api/role-applications/cm5abcd123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cm5abcd123",
    "userId": "user123",
    "role": "ARTIST",
    "status": "PENDING",
    "bio": "I am a traditional Kandyan dancer with 10 years experience...",
    "portfolioUrl": "https://portfolio.com/user",
    "proofDocumentUrl": "https://storage.supabase.co/documents/user123/proof.pdf",
    "notes": null,
    "createdAt": "2026-02-12T10:00:00Z",
    "updatedAt": "2026-02-12T10:00:00Z",
    "user": {
      "id": "user123",
      "email": "artist@example.com",
      "fullName": "Nimal Perera",
      "firstName": "Nimal",
      "lastName": "Perera",
      "phone": "+94771234567",
      "city": "Kandy",
      "avatarUrl": "https://...",
      "role": "USER",
      "createdAt": "2026-01-15T08:00:00Z",
      "updatedAt": "2026-02-10T12:00:00Z"
    }
  }
}
```

---

### 3. Approve Application (POST)

**POST** `http://localhost:3001/api/role-applications/:id/approve`

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**Request Body (Optional):**
```json
{
  "description": "Approved based on excellent portfolio and experience"
}
```

**Example:**
```
POST http://localhost:3001/api/role-applications/cm5abcd123/approve
```

**Response:**
```json
{
  "success": true,
  "message": "Application approved successfully",
  "data": {
    "id": "cm5abcd123",
    "userId": "user123",
    "role": "ARTIST",
    "status": "APPROVED",
    "bio": "I am a traditional Kandyan dancer...",
    "portfolioUrl": "https://portfolio.com/user",
    "proofDocumentUrl": "https://storage.supabase.co/...",
    "notes": "Approved based on excellent portfolio and experience",
    "createdAt": "2026-02-12T10:00:00Z",
    "updatedAt": "2026-02-12T11:30:00Z"
  }
}
```

**What Happens:**
1. Application status changed to `APPROVED`
2. User's role updated from `USER` to `ARTIST` (or requested role)
3. Optional description saved in notes field
4. User can now access artist-specific features

---

### 4. Reject Application (POST)

**POST** `http://localhost:3001/api/role-applications/:id/reject`

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**Request Body (Required):**
```json
{
  "rejectionReason": "Insufficient experience",
  "description": "The portfolio shows only 2 performances. We require at least 5 documented performances for artist role. Please reapply after gaining more experience."
}
```

**Example:**
```
POST http://localhost:3001/api/role-applications/cm5xyz789/reject
```

**Response:**
```json
{
  "success": true,
  "message": "Application rejected successfully",
  "data": {
    "id": "cm5xyz789",
    "userId": "user456",
    "role": "ARTIST",
    "status": "REJECTED",
    "bio": "I am a dancer...",
    "portfolioUrl": "https://portfolio.com/user456",
    "proofDocumentUrl": "https://storage.supabase.co/...",
    "notes": "Reason: Insufficient experience\nDescription: The portfolio shows only 2 performances. We require at least 5 documented performances for artist role. Please reapply after gaining more experience.",
    "createdAt": "2026-02-12T09:00:00Z",
    "updatedAt": "2026-02-12T11:35:00Z"
  }
}
```

**What Happens:**
1. Application status changed to `REJECTED`
2. User's role remains unchanged (stays as `USER`)
3. Rejection reason and description saved in notes field
4. User can see the rejection reason in their applications

---

### 5. Get All Applications (with Filters)

**GET** `http://localhost:3001/api/role-applications/all`

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Query Parameters (Optional):**
- `status` - Filter by status: `PENDING`, `APPROVED`, `REJECTED`, or `ALL`
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Examples:**
```
GET http://localhost:3001/api/role-applications/all
GET http://localhost:3001/api/role-applications/all?status=APPROVED
GET http://localhost:3001/api/role-applications/all?status=REJECTED&page=2
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cm5abcd123",
      "userId": "user123",
      "role": "ARTIST",
      "status": "APPROVED",
      "bio": "Traditional dancer...",
      "portfolioUrl": "https://...",
      "proofDocumentUrl": "https://...",
      "notes": "Approved based on experience",
      "createdAt": "2026-02-12T10:00:00Z",
      "updatedAt": "2026-02-12T11:30:00Z",
      "user": {
        "id": "user123",
        "email": "artist@example.com",
        "fullName": "Nimal Perera",
        "role": "ARTIST"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

---

## Postman Testing Steps

### Step 1: Setup Environment
1. Open Postman
2. Create new Collection: "Admin Role Actions"
3. Add variable `base_url` = `http://localhost:3001/api/role-applications`
4. Add variable `admin_token` = (your admin token)

### Step 2: Create Requests

#### Request 1: Get Pending Applications
- Method: `GET`
- URL: `{{base_url}}/pending`
- Headers:
  - `Authorization`: `Bearer {{admin_token}}`

#### Request 2: View Single Application
- Method: `GET`
- URL: `{{base_url}}/cm5abcd123` (replace with actual ID)
- Headers:
  - `Authorization`: `Bearer {{admin_token}}`

#### Request 3: Approve Application
- Method: `POST`
- URL: `{{base_url}}/cm5abcd123/approve` (replace with actual ID)
- Headers:
  - `Authorization`: `Bearer {{admin_token}}`
  - `Content-Type`: `application/json`
- Body (raw JSON):
```json
{
  "description": "Great portfolio and experience"
}
```

#### Request 4: Reject Application
- Method: `POST`
- URL: `{{base_url}}/cm5xyz789/reject` (replace with actual ID)
- Headers:
  - `Authorization`: `Bearer {{admin_token}}`
  - `Content-Type`: `application/json`
- Body (raw JSON):
```json
{
  "rejectionReason": "Insufficient documentation",
  "description": "Please provide more detailed proof of experience and reapply."
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```
**Solution:** Check your admin token

### 403 Forbidden
```json
{
  "error": "Forbidden: Admin access required"
}
```
**Solution:** User is not an admin

### 404 Not Found
```json
{
  "success": false,
  "error": "Application not found"
}
```
**Solution:** Check the application ID

### 400 Bad Request (Reject without reason)
```json
{
  "success": false,
  "error": "Rejection reason is required when rejecting an application."
}
```
**Solution:** Include `rejectionReason` in request body

### 400 Bad Request (Already processed)
```json
{
  "success": false,
  "error": "Only pending applications can be approved"
}
```
**Solution:** Application is already approved/rejected

---

## Testing Workflow

### Complete Test Scenario:

1. **Get Pending Applications**
   ```
   GET /pending
   ```
   - Copy an application ID from response

2. **View Full Details**
   ```
   GET /:id
   ```
   - Review user details, bio, portfolio

3. **Approve Application**
   ```
   POST /:id/approve
   {
     "description": "Excellent credentials"
   }
   ```
   - Verify status changed to APPROVED
   - Verify user role updated

4. **Get Another Pending Application**
   ```
   GET /pending
   ```
   - Get a different application ID

5. **Reject Application**
   ```
   POST /:id/reject
   {
     "rejectionReason": "Incomplete information",
     "description": "Portfolio link is broken. Please update and reapply."
   }
   ```
   - Verify status changed to REJECTED
   - Verify notes contain rejection reason

6. **View All Applications**
   ```
   GET /all?status=APPROVED
   GET /all?status=REJECTED
   ```
   - Verify filtered results

---

## Summary

✅ **Read Pending Applications** - `GET /pending`
✅ **View Single Application** - `GET /:id`
✅ **Approve Application** - `POST /:id/approve` (with optional description)
✅ **Reject Application** - `POST /:id/reject` (with required reason + optional description)
✅ **View All Applications** - `GET /all` (with status filter)

All admin actions use POST method for approve/reject operations as requested.
