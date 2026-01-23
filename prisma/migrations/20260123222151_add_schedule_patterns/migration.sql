-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "calendarSyncStatus" TEXT,
ADD COLUMN     "currentEnrollment" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "externalEventId" TEXT,
ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "maxStudents" INTEGER,
ADD COLUMN     "schedulePatternId" INTEGER;

-- CreateTable
CREATE TABLE "ClassSchedulePattern" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "classStepId" INTEGER,
    "recurrenceRule" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "startTime" TEXT NOT NULL,
    "durationHours" DECIMAL(4,2) NOT NULL,
    "maxStudents" INTEGER NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSchedulePattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassSchedulePattern_studioId_idx" ON "ClassSchedulePattern"("studioId");

-- CreateIndex
CREATE INDEX "ClassSchedulePattern_classId_idx" ON "ClassSchedulePattern"("classId");

-- CreateIndex
CREATE INDEX "ClassSchedulePattern_classStepId_idx" ON "ClassSchedulePattern"("classStepId");

-- CreateIndex
CREATE INDEX "ClassSchedulePattern_startDate_idx" ON "ClassSchedulePattern"("startDate");

-- CreateIndex
CREATE INDEX "ClassSession_schedulePatternId_idx" ON "ClassSession"("schedulePatternId");

-- AddForeignKey
ALTER TABLE "ClassSchedulePattern" ADD CONSTRAINT "ClassSchedulePattern_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSchedulePattern" ADD CONSTRAINT "ClassSchedulePattern_classStepId_fkey" FOREIGN KEY ("classStepId") REFERENCES "ClassStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_schedulePatternId_fkey" FOREIGN KEY ("schedulePatternId") REFERENCES "ClassSchedulePattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;
