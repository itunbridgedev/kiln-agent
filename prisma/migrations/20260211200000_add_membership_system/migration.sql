-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'PAST_DUE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OpenStudioBookingStatus" AS ENUM ('RESERVED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- AlterTable: Add resource hold fields to ClassSession
ALTER TABLE "ClassSession" ADD COLUMN "reserveFullCapacity" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClassSession" ADD COLUMN "resourceReleaseHours" INTEGER;

-- CreateTable: Membership
CREATE TABLE "Membership" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL,
    "benefits" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MembershipSubscription
CREATE TABLE "MembershipSubscription" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "membershipId" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OpenStudioBooking
CREATE TABLE "OpenStudioBooking" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "OpenStudioBookingStatus" NOT NULL,
    "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "OpenStudioBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Membership_studioId_idx" ON "Membership"("studioId");
CREATE UNIQUE INDEX "Membership_studioId_name_key" ON "Membership"("studioId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipSubscription_stripeSubscriptionId_key" ON "MembershipSubscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "MembershipSubscription_studioId_customerId_membershipId_key" ON "MembershipSubscription"("studioId", "customerId", "membershipId");
CREATE INDEX "MembershipSubscription_studioId_status_idx" ON "MembershipSubscription"("studioId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OpenStudioBooking_sessionId_resourceId_startTime_key" ON "OpenStudioBooking"("sessionId", "resourceId", "startTime");
CREATE INDEX "OpenStudioBooking_studioId_sessionId_idx" ON "OpenStudioBooking"("studioId", "sessionId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MembershipSubscription" ADD CONSTRAINT "MembershipSubscription_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipSubscription" ADD CONSTRAINT "MembershipSubscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipSubscription" ADD CONSTRAINT "MembershipSubscription_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OpenStudioBooking" ADD CONSTRAINT "OpenStudioBooking_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpenStudioBooking" ADD CONSTRAINT "OpenStudioBooking_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MembershipSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpenStudioBooking" ADD CONSTRAINT "OpenStudioBooking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpenStudioBooking" ADD CONSTRAINT "OpenStudioBooking_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "StudioResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
