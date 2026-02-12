-- Add RequestStatus enum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Add new roles to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SELLER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TEACHER';

-- Create RoleRequest table
CREATE TABLE "RoleRequest" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleRequest_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "RoleRequest_userId_idx" ON "RoleRequest"("userId");
CREATE INDEX "RoleRequest_status_idx" ON "RoleRequest"("status");
CREATE INDEX "RoleRequest_requestedRole_idx" ON "RoleRequest"("requestedRole");

-- Add foreign key constraint
ALTER TABLE "RoleRequest" ADD CONSTRAINT "RoleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
