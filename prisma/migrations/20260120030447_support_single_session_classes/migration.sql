-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "classType" TEXT NOT NULL DEFAULT 'multi-session',
ADD COLUMN     "durationHours" DECIMAL(4,2),
ALTER COLUMN "durationWeeks" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ClassSchedule" ALTER COLUMN "endDate" DROP NOT NULL,
ALTER COLUMN "dayOfWeek" DROP NOT NULL;
