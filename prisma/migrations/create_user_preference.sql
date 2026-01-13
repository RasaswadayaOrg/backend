-- Create UserPreference table for storing cultural preferences
-- Run this SQL in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS "UserPreference" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categories" TEXT[] DEFAULT '{}',
    "culturalInterests" TEXT[] DEFAULT '{}',
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on userId
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreference_userId_key" ON "UserPreference"("userId");

-- Add foreign key constraint
ALTER TABLE "UserPreference" 
ADD CONSTRAINT "UserPreference_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS (Row Level Security)
ALTER TABLE "UserPreference" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on UserPreference" ON "UserPreference"
    FOR ALL
    USING (true)
    WITH CHECK (true);
