-- CreateEnum
CREATE TYPE "PassType" AS ENUM ('UNLIMITED_SERIES', 'PUNCH_PASS', 'FULL_COURSE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CHECKED_IN', 'ATTENDED', 'NO_SHOW', 'CANCELLED', 'AUTO_CANCELLED');

-- AlterTable: Add new fields to ClassRegistration for flexible reservations
ALTER TABLE "ClassRegistration" ADD COLUMN "passType" "PassType" DEFAULT 'FULL_COURSE';
ALTER TABLE "ClassRegistration" ADD COLUMN "sessionsIncluded" INTEGER;
ALTER TABLE "ClassRegistration" ADD COLUMN "sessionsRemaining" INTEGER;
ALTER TABLE "ClassRegistration" ADD COLUMN "sessionsAttended" INTEGER DEFAULT 0;
ALTER TABLE "ClassRegistration" ADD COLUMN "maxAdvanceReservations" INTEGER DEFAULT 3;
ALTER TABLE "ClassRegistration" ADD COLUMN "requiresSequentialAttendance" BOOLEAN DEFAULT false;
ALTER TABLE "ClassRegistration" ADD COLUMN "absenceGracePeriodHours" INTEGER DEFAULT 24;
ALTER TABLE "ClassRegistration" ADD COLUMN "validFrom" TIMESTAMP(3);
ALTER TABLE "ClassRegistration" ADD COLUMN "validUntil" TIMESTAMP(3);

-- AlterTable: Add sequence requirement to ClassStep (IF NOT EXISTS since previous migration may have added these)
ALTER TABLE "ClassStep" ADD COLUMN IF NOT EXISTS "requiresSequence" BOOLEAN DEFAULT false;
ALTER TABLE "ClassStep" ADD COLUMN IF NOT EXISTS "allowMakeup" BOOLEAN DEFAULT false;

-- CreateTable: SessionReservation (replaces RegistrationSession for more granular control)
CREATE TABLE "SessionReservation" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "reservationStatus" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    
    -- Reservation lifecycle
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservedBy" INTEGER, -- customerId who made reservation (null if guest)
    
    -- Check-in tracking
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" INTEGER, -- customerId who checked in (customer or staff)
    "checkedInMethod" TEXT, -- 'SELF', 'STAFF', 'AUTO'
    
    -- Attendance tracking  
    "attendedAt" TIMESTAMP(3),
    "noShowDetectedAt" TIMESTAMP(3),
    "autoCancelledAt" TIMESTAMP(3),
    
    -- Cancellation
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" INTEGER, -- customerId who cancelled
    "cancellationReason" TEXT,
    
    -- Notes
    "staffNotes" TEXT,
    "customerNotes" TEXT,
    
    -- Punch tracking
    "punchUsed" BOOLEAN DEFAULT false,
    "punchDeductedAt" TIMESTAMP(3),
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReservationHistory (audit log)
CREATE TABLE "ReservationHistory" (
    "id" SERIAL NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "action" TEXT NOT NULL, -- 'CREATED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW', 'AUTO_CANCELLED'
    "performedBy" INTEGER, -- customerId who performed action
    "performedByRole" TEXT, -- 'CUSTOMER', 'STAFF', 'SYSTEM'
    "previousStatus" "ReservationStatus",
    "newStatus" "ReservationStatus",
    "reason" TEXT,
    "metadata" JSONB, -- Additional context
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NoShowPolicy (configurable per studio/class)
CREATE TABLE "NoShowPolicy" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "classId" INTEGER, -- null means studio-wide default
    
    -- Policy settings
    "gracePeriodHours" INTEGER NOT NULL DEFAULT 24, -- Hours after no-show before auto-cancel
    "maxNoShowsBeforeSuspension" INTEGER DEFAULT 3,
    "suspensionDurationDays" INTEGER DEFAULT 7,
    "deductPunchOnNoShow" BOOLEAN DEFAULT true,
    "allowSameDayRebooking" BOOLEAN DEFAULT false,
    "sendNoShowNotification" BOOLEAN DEFAULT true,
    "sendAutoCancelNotification" BOOLEAN DEFAULT true,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoShowPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CustomerSuspension (track suspended customers)
CREATE TABLE "CustomerSuspension" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "noShowCount" INTEGER DEFAULT 0,
    "suspendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedUntil" TIMESTAMP(3) NOT NULL,
    "liftedAt" TIMESTAMP(3),
    "liftedBy" INTEGER, -- staff member who lifted suspension
    "liftedReason" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSuspension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionReservation_studioId_idx" ON "SessionReservation"("studioId");
CREATE INDEX "SessionReservation_registrationId_idx" ON "SessionReservation"("registrationId");
CREATE INDEX "SessionReservation_sessionId_idx" ON "SessionReservation"("sessionId");
CREATE INDEX "SessionReservation_reservationStatus_idx" ON "SessionReservation"("reservationStatus");
CREATE INDEX "SessionReservation_registrationId_reservationStatus_idx" ON "SessionReservation"("registrationId", "reservationStatus");
CREATE INDEX "SessionReservation_sessionId_reservationStatus_idx" ON "SessionReservation"("sessionId", "reservationStatus");
CREATE INDEX "SessionReservation_reservedAt_idx" ON "SessionReservation"("reservedAt");
CREATE INDEX "SessionReservation_checkedInAt_idx" ON "SessionReservation"("checkedInAt");
CREATE UNIQUE INDEX "SessionReservation_registrationId_sessionId_key" ON "SessionReservation"("registrationId", "sessionId");

CREATE INDEX "ReservationHistory_reservationId_idx" ON "ReservationHistory"("reservationId");
CREATE INDEX "ReservationHistory_timestamp_idx" ON "ReservationHistory"("timestamp");

CREATE INDEX "NoShowPolicy_studioId_idx" ON "NoShowPolicy"("studioId");
CREATE INDEX "NoShowPolicy_classId_idx" ON "NoShowPolicy"("classId");
CREATE UNIQUE INDEX "NoShowPolicy_studioId_classId_key" ON "NoShowPolicy"("studioId", "classId");

CREATE INDEX "CustomerSuspension_studioId_idx" ON "CustomerSuspension"("studioId");
CREATE INDEX "CustomerSuspension_customerId_idx" ON "CustomerSuspension"("customerId");
CREATE INDEX "CustomerSuspension_isActive_idx" ON "CustomerSuspension"("isActive");
CREATE INDEX "CustomerSuspension_suspendedUntil_idx" ON "CustomerSuspension"("suspendedUntil");

-- AddForeignKey
ALTER TABLE "SessionReservation" ADD CONSTRAINT "SessionReservation_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "ClassRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionReservation" ADD CONSTRAINT "SessionReservation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionReservation" ADD CONSTRAINT "SessionReservation_reservedBy_fkey" FOREIGN KEY ("reservedBy") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SessionReservation" ADD CONSTRAINT "SessionReservation_checkedInBy_fkey" FOREIGN KEY ("checkedInBy") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SessionReservation" ADD CONSTRAINT "SessionReservation_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReservationHistory" ADD CONSTRAINT "ReservationHistory_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "SessionReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationHistory" ADD CONSTRAINT "ReservationHistory_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NoShowPolicy" ADD CONSTRAINT "NoShowPolicy_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoShowPolicy" ADD CONSTRAINT "NoShowPolicy_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerSuspension" ADD CONSTRAINT "CustomerSuspension_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerSuspension" ADD CONSTRAINT "CustomerSuspension_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerSuspension" ADD CONSTRAINT "CustomerSuspension_liftedBy_fkey" FOREIGN KEY ("liftedBy") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
