/*
  Warnings:

  - The primary key for the `AuthIdentity` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `AuthIdentity` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `AuthIdentity` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `AuthIdentity` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `AuthIdentity` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `AuthIdentity` table. All the data in the column will be lost.
  - You are about to drop the column `providerUserId` on the `AuthIdentity` table. All the data in the column will be lost.
  - The `id` column on the `AuthIdentity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Customer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `firstName` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Customer` table. All the data in the column will be lost.
  - The `id` column on the `Customer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `CustomerRole` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EmailCredential` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `passwordUpdatedAt` on the `EmailCredential` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `EmailCredential` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `providerAccountId` to the `AuthIdentity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `customerId` on the `CustomerRole` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `email` to the `EmailCredential` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `authIdentityId` on the `EmailCredential` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "AuthIdentity" DROP CONSTRAINT "AuthIdentity_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerRole" DROP CONSTRAINT "CustomerRole_customerId_fkey";

-- DropForeignKey
ALTER TABLE "EmailCredential" DROP CONSTRAINT "EmailCredential_authIdentityId_fkey";

-- DropIndex
DROP INDEX "AuthIdentity_provider_providerUserId_key";

-- AlterTable
ALTER TABLE "AuthIdentity" DROP CONSTRAINT "AuthIdentity_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "email",
DROP COLUMN "emailVerified",
DROP COLUMN "lastLoginAt",
DROP COLUMN "providerUserId",
ADD COLUMN     "providerAccountId" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_pkey",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "status",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "picture" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ADD CONSTRAINT "Customer_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "CustomerRole" DROP CONSTRAINT "CustomerRole_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "customerId",
ADD COLUMN     "customerId" INTEGER NOT NULL,
ADD CONSTRAINT "CustomerRole_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "EmailCredential" DROP CONSTRAINT "EmailCredential_pkey",
DROP COLUMN "passwordUpdatedAt",
ADD COLUMN     "customerId" INTEGER,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "authIdentityId",
ADD COLUMN     "authIdentityId" INTEGER NOT NULL,
ADD CONSTRAINT "EmailCredential_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "tokenType" TEXT,
    "scope" TEXT,
    "idToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCredential_email_key" ON "EmailCredential"("email");

-- AddForeignKey
ALTER TABLE "CustomerRole" ADD CONSTRAINT "CustomerRole_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCredential" ADD CONSTRAINT "EmailCredential_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCredential" ADD CONSTRAINT "EmailCredential_authIdentityId_fkey" FOREIGN KEY ("authIdentityId") REFERENCES "AuthIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
