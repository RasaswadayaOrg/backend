# ✅ Role Upgrade Feature - Implementation Checklist

## 📝 What's Next?

Follow these steps in order to complete the setup:

---

## 🗄️ Step 1: Database Setup (REQUIRED)

**You MUST run the SQL migration before the backend will work.**

### Option A: Manual SQL (Recommended - Safe)
1. Open Supabase SQL Editor
2. Copy all contents from `manual_migration_role_request.sql`
3. Paste and run in SQL editor
4. Verify success message appears

### Option B: Check if already exists
```sql
-- Run this in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'RoleRequest';
```

If it returns a row, the table already exists! ✅

---

## 🔧 Step 2: Backend Setup

### 2.1 Regenerate Prisma Client
```bash
cd backend
npx prisma generate
```

### 2.2 Restart VS Code
- Close VS Code completely
- Reopen VS Code
- This ensures TypeScript picks up new Prisma types

### 2.3 Start Backend
```bash
cd backend
npm run dev
```

**Expected output:**
```
🚀 Rasaswadaya API server running on port 3001
📍 Health check: http://localhost:3001/health
```

### 2.4 Verify No TypeScript Errors
- Check VS Code Problems panel
- Should have 0 errors in `roleRequest.controller.ts`

---

## 🎨 Step 3: Frontend Setup

### 3.1 Start Frontend
```bash
cd frontend
npm run dev
```

### 3.2 Test Login
1. Go to `http://localhost:3000/login`
2. Login with existing account
3. Token should be stored in localStorage

---

## 🧪 Step 4: Test the Feature

### 4.1 User Flow
1. Navigate to `http://localhost:3000/profile`
2. Click "Apply for Role Upgrade" button
3. Select role(s): Artist, Organizer, Seller, or Teacher
4. Fill in required fields for each role
5. Upload documents (max 5MB, PDF or images)
6. Enter reason and contact info
7. Click "Submit Request"
8. Should see success message ✅

### 4.2 Backend Verification
Check terminal for:
```
POST /api/role-requests/apply 201
```

### 4.3 Database Verification
Run in Supabase SQL Editor:
```sql
SELECT * FROM "RoleRequest" ORDER BY "requestedAt" DESC LIMIT 5;
```

Should see your new request! 🎉

---

## 🔐 Step 5: Test Admin Endpoints (Optional)

### 5.1 Get Admin Token
```bash
cd backend
npm run create-admin
```

Or get existing admin token from localStorage.

### 5.2 Test API
```bash
# Update token in script first
./test-role-request-api.sh
```

### 5.3 Manual API Tests

**Get pending requests:**
```bash
curl http://localhost:3001/api/role-requests/pending \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Approve a request:**
```bash
curl -X PATCH http://localhost:3001/api/role-requests/REQUEST_ID/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Reject a request:**
```bash
curl -X PATCH http://localhost:3001/api/role-requests/REQUEST_ID/reject \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rejectionReason": "Need more documentation"}'
```

---

## ✅ Verification Checklist

Check off each item as you complete it:

### Database
- [ ] RoleRequest table exists in database
- [ ] SELLER and TEACHER added to UserRole enum
- [ ] RequestStatus enum created
- [ ] Sample data visible in database

### Backend
- [ ] Prisma client regenerated
- [ ] VS Code restarted (TypeScript server refreshed)
- [ ] Backend starts without errors
- [ ] No TypeScript errors in Problems panel
- [ ] `/api/role-requests/apply` endpoint responds
- [ ] Uploaded files saved to `uploads/role-documents/`

### Frontend
- [ ] Frontend starts successfully
- [ ] Profile page loads without errors
- [ ] "Apply for Role Upgrade" button visible
- [ ] Modal opens when button clicked
- [ ] Can select multiple roles
- [ ] Role-specific fields appear dynamically
- [ ] File upload works (under 5MB)
- [ ] Form validation works
- [ ] Submit succeeds and shows success message

### Integration
- [ ] User can submit role requests
- [ ] Requests appear in database
- [ ] Files are uploaded and saved
- [ ] Admin can view pending requests
- [ ] Admin can approve requests
- [ ] User role updates after approval
- [ ] Admin can reject with reason

---

## 🚨 Common Issues & Solutions

### Issue: "Property 'roleRequest' does not exist"
**Solution:**
```bash
cd backend
npx prisma generate
# Then restart VS Code
```

### Issue: Database connection error
**Solution:**
- Check `.env` file has correct `DATABASE_URL`
- Verify Supabase is accessible

### Issue: File upload fails
**Solution:**
- Ensure `uploads/role-documents/` directory exists
- Check file size (must be < 5MB)
- Check file type (JPEG, PNG, PDF only)

### Issue: CORS error in frontend
**Solution:**
- Backend should be on port 3001
- Frontend should be on port 3000
- Check CORS config in `backend/src/index.ts`

### Issue: 401 Unauthorized
**Solution:**
- Check token exists in localStorage
- Token should not be expired
- Login again if needed

---

## 📊 Expected Results

### After Successful Setup:

1. **User submits request:**
   - ✅ HTTP 201 Created
   - ✅ Success message shown
   - ✅ Page refreshes
   - ✅ Entry in RoleRequest table

2. **Admin views requests:**
   - ✅ HTTP 200 OK
   - ✅ List of pending requests
   - ✅ User details included

3. **Admin approves:**
   - ✅ HTTP 200 OK
   - ✅ Request status = APPROVED
   - ✅ User role updated
   - ✅ reviewedAt timestamp set

4. **Admin rejects:**
   - ✅ HTTP 200 OK
   - ✅ Request status = REJECTED
   - ✅ rejectionReason saved

---

## 🎯 You're Done When...

- [ ] User can submit role upgrade requests from profile page
- [ ] Files are uploaded successfully
- [ ] Requests appear in database
- [ ] Admin can view all requests
- [ ] Admin can approve/reject requests
- [ ] No console errors in frontend
- [ ] No TypeScript errors in backend

---

## 📚 Documentation Reference

- `ROLE_UPGRADE_SETUP_GUIDE.md` - Detailed setup instructions
- `NESTJS_ROLE_UPGRADE_IMPLEMENTATION.md` - Full implementation details
- `manual_migration_role_request.sql` - Database migration script
- `test-role-request-api.sh` - API testing script

---

## 🎉 Success!

Once all items are checked, your Role Upgrade feature is fully functional!

**Next steps:**
- Build admin dashboard UI to manage requests
- Add email notifications
- Add real-time status updates
- Implement analytics and reporting

Need help? Check the documentation files or review the implementation code.
