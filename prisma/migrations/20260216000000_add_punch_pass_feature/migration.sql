-- CreateTable: PunchPass
CREATE TABLE "PunchPass" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "punchCount" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "expirationDays" INTEGER NOT NULL,
    "isTransferable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PunchPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CustomerPunchPass
CREATE TABLE "CustomerPunchPass" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "punchPassId" INTEGER NOT NULL,
    "punchesRemaining" INTEGER NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPunchPass_pkey" PRIMARY KEY ("id")
);

-- AddColumn: OpenStudioBooking.customerPunchPassId
ALTER TABLE "OpenStudioBooking" ADD COLUMN "customerPunchPassId" INTEGER;

-- ModifyColumn: OpenStudioBooking.subscriptionId (make nullable)
ALTER TABLE "OpenStudioBooking" ALTER COLUMN "subscriptionId" DROP NOT NULL;

-- CreateIndex: PunchPass
CREATE UNIQUE INDEX "PunchPass_studioId_punchCount_key" ON "PunchPass"("studioId", "punchCount");
CREATE INDEX "PunchPass_studioId_idx" ON "PunchPass"("studioId");

-- CreateIndex: CustomerPunchPass
CREATE INDEX "CustomerPunchPass_customerId_idx" ON "CustomerPunchPass"("customerId");
CREATE INDEX "CustomerPunchPass_studioId_customerId_idx" ON "CustomerPunchPass"("studioId", "customerId");

-- AddForeignKey: PunchPass -> Studio
ALTER TABLE "PunchPass" ADD CONSTRAINT "PunchPass_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CustomerPunchPass -> Studio
ALTER TABLE "CustomerPunchPass" ADD CONSTRAINT "CustomerPunchPass_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CustomerPunchPass -> Customer
ALTER TABLE "CustomerPunchPass" ADD CONSTRAINT "CustomerPunchPass_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CustomerPunchPass -> PunchPass
ALTER TABLE "CustomerPunchPass" ADD CONSTRAINT "CustomerPunchPass_punchPassId_fkey" FOREIGN KEY ("punchPassId") REFERENCES "PunchPass"("id") ON UPDATE CASCADE;

-- AddForeignKey: OpenStudioBooking.customerPunchPassId -> CustomerPunchPass
ALTER TABLE "OpenStudioBooking" ADD CONSTRAINT "OpenStudioBooking_customerPunchPassId_fkey" FOREIGN KEY ("customerPunchPassId") REFERENCES "CustomerPunchPass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ModifyForeignKey: OpenStudioBooking.subscriptionId (allow null)
ALTER TABLE "OpenStudioBooking" DROP CONSTRAINT "OpenStudioBooking_subscriptionId_fkey";
ALTER TABLE "OpenStudioBooking" ADD CONSTRAINT "OpenStudioBooking_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MembershipSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
