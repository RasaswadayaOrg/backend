# Role Application API Documentation

This document describes the backend API endpoints for managing role applications with user details view, approve/reject functionality, and reject reason handling.

## Endpoints

### 1. Get Role Application Details (Admin Only)

**Endpoint:** `GET /api/role-applications/:id`

**Description:** Retrieves detailed information about a specific role application including full user details.

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` (string, required): The ID of the role application

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "clxxx123",
    "userId": "clyyy456",
    "role": "ARTIST",
    "status": "PENDING",
    "bio": "Professional dancer with 10 years of experience...",
    "portfolioUrl": "https://portfolio.example.com",
    "proofDocumentUrl": "https://storage.supabase.co/.../document.pdf",
    "notes": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "user": {
      "id": "clyyy456",
      "email": "user@example.com",
      "fullName": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+94771234567",
      "city": "Colombo",
      "avatarUrl": "https://example.com/avatar.jpg",
      "role": "USER",
      "createdAt": "2024-01-01T08:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "error": "Application not found"
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "error": "Failed to fetch application details"
}
```

---

### 2. Update Application Status (Admin Only)

**Endpoint:** `PUT /api/role-applications/:id/status`

**Description:** Approves or rejects a role application. When rejecting, a reason must be provided.

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` (string, required): The ID of the role application

**Request Body:**
```json
{
  "status": "APPROVED" | "REJECTED",
  "rejectReason": "string (required when status is REJECTED)"
}
```

**Example Request (Approve):**
```json
{
  "status": "APPROVED"
}
```

**Example Request (Reject):**
```json
{
  "status": "REJECTED",
  "rejectReason": "Insufficient documentation provided. Please submit valid proof of professional experience."
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Application approved successfully",
  "data": {
    "id": "clxxx123",
    "userId": "clyyy456",
    "role": "ARTIST",
    "status": "APPROVED",
    "bio": "Professional dancer...",
    "portfolioUrl": "https://portfolio.example.com",
    "proofDocumentUrl": "https://storage.supabase.co/.../document.pdf",
    "notes": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Response (Validation Error - 400):**
```json
{
  "success": false,
  "error": "Invalid status. Must be APPROVED or REJECTED."
}
```

```json
{
  "success": false,
  "error": "Reject reason is required when rejecting an application."
}
```

```json
{
  "success": false,
  "error": "Only pending applications can be updated"
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "error": "Application not found"
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "error": "Failed to update application status"
}
```

---

### 3. Get All Applications (Admin Only)

**Endpoint:** `GET /api/role-applications/all`

**Description:** Retrieves a paginated list of all role applications with basic user information.

**Authentication:** Required (Admin only)

**Query Parameters:**
- `status` (string, optional): Filter by status (`PENDING`, `APPROVED`, `REJECTED`, `ALL`)
- `page` (number, optional, default: 1): Page number
- `limit` (number, optional, default: 10): Items per page

**Example Request:**
```
GET /api/role-applications/all?status=PENDING&page=1&limit=10
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx123",
      "userId": "clyyy456",
      "role": "ARTIST",
      "status": "PENDING",
      "bio": "Professional dancer...",
      "portfolioUrl": "https://portfolio.example.com",
      "proofDocumentUrl": "https://storage.supabase.co/.../document.pdf",
      "notes": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "user": {
        "id": "clyyy456",
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

## Implementation Details

### Database Schema

The `RoleApplication` model includes:
- `id`: Unique identifier
- `userId`: Reference to the user who submitted the application
- `role`: The role being applied for (ARTIST, ORGANIZER)
- `status`: Application status (PENDING, APPROVED, REJECTED)
- `bio`: User's bio (optional, mainly for artists)
- `portfolioUrl`: Portfolio URL (optional, mainly for artists)
- `proofDocumentUrl`: URL to uploaded proof document
- `notes`: Admin notes or reject reason
- `createdAt`: Timestamp of application submission
- `updatedAt`: Timestamp of last update

### Business Logic

1. **Get Application Details:**
   - Retrieves full user details along with application data
   - Includes all user fields for comprehensive review
   - Admin authentication required

2. **Approve Application:**
   - Updates application status to APPROVED
   - Automatically updates the user's role in the User table
   - No notes required for approval

3. **Reject Application:**
   - Updates application status to REJECTED
   - **Requires a reject reason** (validated on backend)
   - Stores reject reason in the `notes` field
   - User role is NOT updated

4. **Validation:**
   - Only PENDING applications can be approved/rejected
   - Reject reason is mandatory when rejecting
   - Invalid status values are rejected

### Error Handling

All endpoints return consistent error responses with:
- `success: false` flag
- Descriptive error messages
- Appropriate HTTP status codes

### Security

- All admin endpoints are protected with authentication and authorization middleware
- Only users with ADMIN role can access these endpoints
- Application IDs are validated to prevent unauthorized access

## Testing with Postman/cURL

### Get Application Details
```bash
curl -X GET http://localhost:3000/api/role-applications/{applicationId} \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Approve Application
```bash
curl -X PUT http://localhost:3000/api/role-applications/{applicationId}/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "APPROVED"}'
```

### Reject Application
```bash
curl -X PUT http://localhost:3000/api/role-applications/{applicationId}/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REJECTED",
    "rejectReason": "Insufficient documentation. Please provide valid proof of experience."
  }'
```

### Get All Applications (Pending only)
```bash
curl -X GET "http://localhost:3000/api/role-applications/all?status=PENDING&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Integration Notes for Frontend

1. **User Details View:**
   - Fetch application details using `GET /api/role-applications/:id`
   - Display user information (name, email, phone, city, etc.)
   - Display application details (role, bio, portfolio, proof document)
   - Show application status and submission date

2. **Approve Button:**
   - Send `PUT /api/role-applications/:id/status` with `{"status": "APPROVED"}`
   - Show success message on approval
   - Redirect to applications list or refresh current view

3. **Reject Button + Reason Field:**
   - Provide a text input/textarea for reject reason
   - Validate that reject reason is not empty before submitting
   - Send `PUT /api/role-applications/:id/status` with `{"status": "REJECTED", "rejectReason": "..."}`
   - Show success message with reject reason confirmation
   - Consider showing a modal for reject reason input

4. **Error Handling:**
   - Display validation errors to admin (e.g., "Reject reason is required")
   - Handle 404 errors (application not found)
   - Handle authorization errors (403/401)

## Next Steps

The backend implementation is complete. The frontend team can now:
1. Create a user details page that displays application and user information
2. Implement Approve and Reject buttons with proper API calls
3. Add a reject reason input field (text area or modal)
4. Handle success/error responses appropriately
5. Update the applications list after approve/reject actions
