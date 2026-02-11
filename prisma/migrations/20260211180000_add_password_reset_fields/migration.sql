-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "Customer" ADD COLUMN "passwordResetExpires" TIMESTAMP(3);
