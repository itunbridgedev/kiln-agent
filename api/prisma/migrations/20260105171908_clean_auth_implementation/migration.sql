/*
  Warnings:

  - You are about to drop the `AuthIdentity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmailCredential` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[customerId,roleId]` on the table `CustomerRole` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "CustomerRole" DROP CONSTRAINT "CustomerRole_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerRole" DROP CONSTRAINT "CustomerRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "EmailCredential" DROP CONSTRAINT "EmailCredential_authIdentityId_fkey";

-- DropForeignKey
ALTER TABLE "EmailCredential" DROP CONSTRAINT "EmailCredential_customerId_fkey";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "passwordHash" TEXT;

-- DropTable
DROP TABLE "AuthIdentity";

-- DropTable
DROP TABLE "EmailCredential";

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRole_customerId_roleId_key" ON "CustomerRole"("customerId", "roleId");

-- AddForeignKey
ALTER TABLE "CustomerRole" ADD CONSTRAINT "CustomerRole_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRole" ADD CONSTRAINT "CustomerRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
