-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('SINGLE_SESSION', 'FULL_SCHEDULE', 'DROP_IN');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'WAITLISTED', 'CANCELLED', 'REFUNDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIAL_REFUND');

-- CreateTable
CREATE TABLE "ClassRegistration" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "scheduleId" INTEGER,
    "classId" INTEGER NOT NULL,
    "registrationType" "RegistrationType" NOT NULL,
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentIntentId" TEXT,
    "refundAmount" DECIMAL(10,2),
    "refundedAt" TIMESTAMP(3),
    "customerNotes" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationSession" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "attendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassWaitlist" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "scheduleId" INTEGER,
    "sessionId" INTEGER,
    "classId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "convertedToRegistration" BOOLEAN NOT NULL DEFAULT false,
    "registrationId" INTEGER,
    "removedAt" TIMESTAMP(3),
    "removalReason" TEXT,
    "customerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassRegistration_studioId_idx" ON "ClassRegistration"("studioId");

-- CreateIndex
CREATE INDEX "ClassRegistration_customerId_idx" ON "ClassRegistration"("customerId");

-- CreateIndex
CREATE INDEX "ClassRegistration_scheduleId_idx" ON "ClassRegistration"("scheduleId");

-- CreateIndex
CREATE INDEX "ClassRegistration_classId_idx" ON "ClassRegistration"("classId");

-- CreateIndex
CREATE INDEX "ClassRegistration_registrationStatus_idx" ON "ClassRegistration"("registrationStatus");

-- CreateIndex
CREATE INDEX "ClassRegistration_paymentStatus_idx" ON "ClassRegistration"("paymentStatus");

-- CreateIndex
CREATE INDEX "RegistrationSession_registrationId_idx" ON "RegistrationSession"("registrationId");

-- CreateIndex
CREATE INDEX "RegistrationSession_sessionId_idx" ON "RegistrationSession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationSession_registrationId_sessionId_key" ON "RegistrationSession"("registrationId", "sessionId");

-- CreateIndex
CREATE INDEX "ClassWaitlist_studioId_idx" ON "ClassWaitlist"("studioId");

-- CreateIndex
CREATE INDEX "ClassWaitlist_customerId_idx" ON "ClassWaitlist"("customerId");

-- CreateIndex
CREATE INDEX "ClassWaitlist_scheduleId_idx" ON "ClassWaitlist"("scheduleId");

-- CreateIndex
CREATE INDEX "ClassWaitlist_sessionId_idx" ON "ClassWaitlist"("sessionId");

-- CreateIndex
CREATE INDEX "ClassWaitlist_classId_idx" ON "ClassWaitlist"("classId");

-- CreateIndex
CREATE INDEX "ClassWaitlist_position_idx" ON "ClassWaitlist"("position");

-- AddForeignKey
ALTER TABLE "ClassRegistration" ADD CONSTRAINT "ClassRegistration_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRegistration" ADD CONSTRAINT "ClassRegistration_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRegistration" ADD CONSTRAINT "ClassRegistration_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationSession" ADD CONSTRAINT "RegistrationSession_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "ClassRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationSession" ADD CONSTRAINT "RegistrationSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassWaitlist" ADD CONSTRAINT "ClassWaitlist_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassWaitlist" ADD CONSTRAINT "ClassWaitlist_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassWaitlist" ADD CONSTRAINT "ClassWaitlist_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassWaitlist" ADD CONSTRAINT "ClassWaitlist_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
