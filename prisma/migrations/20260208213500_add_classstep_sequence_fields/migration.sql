-- Add missing columns to ClassStep table
ALTER TABLE "ClassStep" ADD COLUMN IF NOT EXISTS "requiresSequence" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClassStep" ADD COLUMN IF NOT EXISTS "allowMakeup" BOOLEAN NOT NULL DEFAULT false;
