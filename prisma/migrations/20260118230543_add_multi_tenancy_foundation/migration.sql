/*
  Warnings:

  - A unique constraint covering the columns `[studioId,email]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studioId,name]` on the table `ProductCategory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `studioId` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studioId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studioId` to the `ProductCategory` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable (must be created first)
CREATE TABLE IF NOT EXISTS "Studio" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- Create default studio if it doesn't exist
INSERT INTO "Studio" (id, name, subdomain, "isActive", "createdAt", "updatedAt")
VALUES (1, 'Kiln Agent Studio', 'demo', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Set the sequence to start from 2
SELECT setval('"Studio_id_seq"', GREATEST((SELECT MAX(id) FROM "Studio"), 1), true);

-- DropIndex
DROP INDEX IF EXISTS "Customer_email_key";

-- DropIndex
DROP INDEX IF EXISTS "ProductCategory_name_key";

-- AlterTable - Add columns with default value 1 (the default studio)
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "studioId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "studioId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "featureModule" TEXT,
ADD COLUMN IF NOT EXISTS "isSystemCategory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "studioId" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Studio_subdomain_key" ON "Studio"("subdomain");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_studioId_idx" ON "Customer"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_studioId_email_key" ON "Customer"("studioId", "email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_studioId_idx" ON "Product"("studioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductCategory_studioId_idx" ON "ProductCategory"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProductCategory_studioId_name_key" ON "ProductCategory"("studioId", "name");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Customer_studioId_fkey'
    ) THEN
        ALTER TABLE "Customer" ADD CONSTRAINT "Customer_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProductCategory_studioId_fkey'
    ) THEN
        ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Product_studioId_fkey'
    ) THEN
        ALTER TABLE "Product" ADD CONSTRAINT "Product_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
