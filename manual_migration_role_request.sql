-- Manual migration script for adding RoleRequest table
-- Run this directly in your Supabase SQL editor or psql

-- Step 1: Add RequestStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new values to UserRole enum if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SELLER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'SELLER';
    END IF;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TEACHER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'TEACHER';
    END IF;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- Step 3: Create RoleRequest table
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

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS "RoleRequest_userId_idx" ON "RoleRequest"("userId");
CREATE INDEX IF NOT EXISTS "RoleRequest_status_idx" ON "RoleRequest"("status");
CREATE INDEX IF NOT EXISTS "RoleRequest_requestedRole_idx" ON "RoleRequest"("requestedRole");

-- Step 5: Add foreign key constraint
ALTER TABLE "RoleRequest" 
ADD CONSTRAINT "RoleRequest_userId_fkey" 
FOREIGN KEY ("userId") 
REFERENCES "User"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Verify the table was created
SELECT 'RoleRequest table created successfully!' as status;
SELECT * FROM "RoleRequest" LIMIT 1;
