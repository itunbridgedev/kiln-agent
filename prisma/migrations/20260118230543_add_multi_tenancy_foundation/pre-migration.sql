-- Manual migration for production: Add default studio and migrate existing data
-- Run this BEFORE applying the multi-tenancy migration

-- Step 1: Create a default studio for existing data
INSERT INTO "Studio" (id, name, subdomain, "isActive", "createdAt", "updatedAt")
VALUES (1, 'Kiln Agent Studio', 'demo', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Step 2: Set the sequence to start from 2
SELECT setval('"Studio_id_seq"', COALESCE((SELECT MAX(id) FROM "Studio"), 1), true);
