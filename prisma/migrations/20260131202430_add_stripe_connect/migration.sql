/*
  Warnings:

  - A unique constraint covering the columns `[stripeAccountId]` on the table `Studio` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ClassRegistration" ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "guestPhone" TEXT,
ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripeFeeAmount" DECIMAL(10,2),
ADD COLUMN     "stripeTransferId" TEXT,
ADD COLUMN     "studioPayoutAmount" DECIMAL(10,2),
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ClassSchedulePattern" ADD COLUMN     "defaultAssistantId" INTEGER,
ADD COLUMN     "defaultInstructorId" INTEGER,
ADD COLUMN     "endTime" TEXT;

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeAccountStatus" TEXT DEFAULT 'not_started',
ADD COLUMN     "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeOnboardedAt" TIMESTAMP(3),
ADD COLUMN     "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Studio_stripeAccountId_key" ON "Studio"("stripeAccountId");
