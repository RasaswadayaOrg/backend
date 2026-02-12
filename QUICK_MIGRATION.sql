-- Quick Migration: Add RoleRequest Table
-- Copy and paste this entire script into Supabase SQL Editor

-- Step 1: Create RequestStatus enum
DO $$ BEGIN
    CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'RequestStatus enum already exists, skipping...';
END $$;

-- Step 2: Create RoleRequest table
CREATE TABLE IF NOT EXISTS "RoleRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedRole" "UserRole" NOT NULL,
    "documents" JSONB,
    "textFields" JSONB,
    "reason" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoleRequest_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS "RoleRequest_userId_idx" ON "RoleRequest"("userId");
CREATE INDEX IF NOT EXISTS "RoleRequest_status_idx" ON "RoleRequest"("status");
CREATE INDEX IF NOT EXISTS "RoleRequest_requestedRole_idx" ON "RoleRequest"("requestedRole");

-- Step 4: Add foreign key
DO $$ BEGIN
    ALTER TABLE "RoleRequest" 
    ADD CONSTRAINT "RoleRequest_userId_fkey" 
    FOREIGN KEY ("userId") 
    REFERENCES "User"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Foreign key already exists, skipping...';
END $$;

-- Verify
SELECT 'RoleRequest table created successfully! ✅' as status;
