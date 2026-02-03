-- AlterTable
ALTER TABLE "ClassRegistration" ADD COLUMN     "guestCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "StudioResource" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassResourceRequirement" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "quantityPerStudent" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassResourceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionResourceAllocation" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionResourceAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioResource_studioId_idx" ON "StudioResource"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioResource_studioId_name_key" ON "StudioResource"("studioId", "name");

-- CreateIndex
CREATE INDEX "ClassResourceRequirement_classId_idx" ON "ClassResourceRequirement"("classId");

-- CreateIndex
CREATE INDEX "ClassResourceRequirement_resourceId_idx" ON "ClassResourceRequirement"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassResourceRequirement_classId_resourceId_key" ON "ClassResourceRequirement"("classId", "resourceId");

-- CreateIndex
CREATE INDEX "SessionResourceAllocation_registrationId_idx" ON "SessionResourceAllocation"("registrationId");

-- CreateIndex
CREATE INDEX "SessionResourceAllocation_sessionId_idx" ON "SessionResourceAllocation"("sessionId");

-- CreateIndex
CREATE INDEX "SessionResourceAllocation_resourceId_idx" ON "SessionResourceAllocation"("resourceId");

-- CreateIndex
CREATE INDEX "SessionResourceAllocation_sessionId_resourceId_idx" ON "SessionResourceAllocation"("sessionId", "resourceId");

-- AddForeignKey
ALTER TABLE "StudioResource" ADD CONSTRAINT "StudioResource_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassResourceRequirement" ADD CONSTRAINT "ClassResourceRequirement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassResourceRequirement" ADD CONSTRAINT "ClassResourceRequirement_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "StudioResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionResourceAllocation" ADD CONSTRAINT "SessionResourceAllocation_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "ClassRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionResourceAllocation" ADD CONSTRAINT "SessionResourceAllocation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionResourceAllocation" ADD CONSTRAINT "SessionResourceAllocation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "StudioResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
