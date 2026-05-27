-- Add missing fields to matches table
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "clubId" TEXT;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "homeClubId" TEXT;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "awayClubId" TEXT;

-- Add missing field to athlete_profiles table
ALTER TABLE "athlete_profiles" ADD COLUMN IF NOT EXISTS "clubId" TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "matches_scheduledAt_idx" ON "matches"("scheduledAt");
CREATE INDEX IF NOT EXISTS "matches_clubId_idx" ON "matches"("clubId");
