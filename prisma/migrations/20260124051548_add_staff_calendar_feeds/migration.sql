-- CreateTable
CREATE TABLE "StaffCalendarFeed" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "secureToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCalendarFeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffCalendarFeed_customerId_key" ON "StaffCalendarFeed"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCalendarFeed_secureToken_key" ON "StaffCalendarFeed"("secureToken");

-- CreateIndex
CREATE INDEX "StaffCalendarFeed_secureToken_idx" ON "StaffCalendarFeed"("secureToken");

-- AddForeignKey
ALTER TABLE "StaffCalendarFeed" ADD CONSTRAINT "StaffCalendarFeed_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
