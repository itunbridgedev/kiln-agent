-- CreateTable: OpenStudioWaitlist
CREATE TABLE "OpenStudioWaitlist" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "bookingId" INTEGER,

    CONSTRAINT "OpenStudioWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpenStudioWaitlist_studioId_idx" ON "OpenStudioWaitlist"("studioId");

-- CreateIndex
CREATE INDEX "OpenStudioWaitlist_sessionId_resourceId_startTime_idx" ON "OpenStudioWaitlist"("sessionId", "resourceId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "OpenStudioWaitlist_sessionId_resourceId_startTime_subscripti_key" ON "OpenStudioWaitlist"("sessionId", "resourceId", "startTime", "subscriptionId");

-- AddForeignKey
ALTER TABLE "OpenStudioWaitlist" ADD CONSTRAINT "OpenStudioWaitlist_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenStudioWaitlist" ADD CONSTRAINT "OpenStudioWaitlist_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MembershipSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenStudioWaitlist" ADD CONSTRAINT "OpenStudioWaitlist_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenStudioWaitlist" ADD CONSTRAINT "OpenStudioWaitlist_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "StudioResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
