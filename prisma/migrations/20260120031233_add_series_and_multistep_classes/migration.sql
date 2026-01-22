/*
  Warnings:

  - Added the required column `classId` to the `ClassSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresSequence" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ClassSchedule" ADD COLUMN     "classStepId" INTEGER;

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "classId" INTEGER NOT NULL,
ADD COLUMN     "classStepId" INTEGER,
ALTER COLUMN "scheduleId" DROP NOT NULL,
ALTER COLUMN "sessionNumber" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ClassStep" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationHours" DECIMAL(4,2) NOT NULL,
    "learningObjectives" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassStepEnrollment" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "classStepId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'in-progress',

    CONSTRAINT "ClassStepEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassAttendance" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "attendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ClassAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassStep_studioId_idx" ON "ClassStep"("studioId");

-- CreateIndex
CREATE INDEX "ClassStep_classId_idx" ON "ClassStep"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassStep_classId_stepNumber_key" ON "ClassStep"("classId", "stepNumber");

-- CreateIndex
CREATE INDEX "ClassEnrollment_studioId_idx" ON "ClassEnrollment"("studioId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_scheduleId_idx" ON "ClassEnrollment"("scheduleId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_customerId_idx" ON "ClassEnrollment"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_scheduleId_customerId_key" ON "ClassEnrollment"("scheduleId", "customerId");

-- CreateIndex
CREATE INDEX "ClassStepEnrollment_studioId_idx" ON "ClassStepEnrollment"("studioId");

-- CreateIndex
CREATE INDEX "ClassStepEnrollment_classStepId_idx" ON "ClassStepEnrollment"("classStepId");

-- CreateIndex
CREATE INDEX "ClassStepEnrollment_customerId_idx" ON "ClassStepEnrollment"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassStepEnrollment_classStepId_customerId_key" ON "ClassStepEnrollment"("classStepId", "customerId");

-- CreateIndex
CREATE INDEX "ClassAttendance_studioId_idx" ON "ClassAttendance"("studioId");

-- CreateIndex
CREATE INDEX "ClassAttendance_sessionId_idx" ON "ClassAttendance"("sessionId");

-- CreateIndex
CREATE INDEX "ClassAttendance_customerId_idx" ON "ClassAttendance"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassAttendance_sessionId_customerId_key" ON "ClassAttendance"("sessionId", "customerId");

-- CreateIndex
CREATE INDEX "Class_classType_idx" ON "Class"("classType");

-- CreateIndex
CREATE INDEX "ClassSchedule_classStepId_idx" ON "ClassSchedule"("classStepId");

-- CreateIndex
CREATE INDEX "ClassSession_classId_idx" ON "ClassSession"("classId");

-- CreateIndex
CREATE INDEX "ClassSession_classStepId_idx" ON "ClassSession"("classStepId");

-- AddForeignKey
ALTER TABLE "ClassStep" ADD CONSTRAINT "ClassStep_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_classStepId_fkey" FOREIGN KEY ("classStepId") REFERENCES "ClassStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_classStepId_fkey" FOREIGN KEY ("classStepId") REFERENCES "ClassStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassStepEnrollment" ADD CONSTRAINT "ClassStepEnrollment_classStepId_fkey" FOREIGN KEY ("classStepId") REFERENCES "ClassStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassStepEnrollment" ADD CONSTRAINT "ClassStepEnrollment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
