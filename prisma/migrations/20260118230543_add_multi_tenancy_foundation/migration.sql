/*
  Warnings:

  - A unique constraint covering the columns `[studioId,email]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studioId,name]` on the table `ProductCategory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `studioId` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studioId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studioId` to the `ProductCategory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Customer_email_key";

-- DropIndex
DROP INDEX "ProductCategory_name_key";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "studioId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "studioId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "featureModule" TEXT,
ADD COLUMN     "isSystemCategory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "studioId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Studio" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Studio_subdomain_key" ON "Studio"("subdomain");

-- CreateIndex
CREATE INDEX "Customer_studioId_idx" ON "Customer"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_studioId_email_key" ON "Customer"("studioId", "email");

-- CreateIndex
CREATE INDEX "Product_studioId_idx" ON "Product"("studioId");

-- CreateIndex
CREATE INDEX "ProductCategory_studioId_idx" ON "ProductCategory"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_studioId_name_key" ON "ProductCategory"("studioId", "name");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
