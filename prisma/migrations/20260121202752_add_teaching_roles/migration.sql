-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "teachingRoleId" INTEGER;

-- CreateTable
CREATE TABLE "TeachingRole" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTeachingRole" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "certifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffTeachingRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeachingRole_studioId_idx" ON "TeachingRole"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingRole_studioId_name_key" ON "TeachingRole"("studioId", "name");

-- CreateIndex
CREATE INDEX "StaffTeachingRole_customerId_idx" ON "StaffTeachingRole"("customerId");

-- CreateIndex
CREATE INDEX "StaffTeachingRole_roleId_idx" ON "StaffTeachingRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffTeachingRole_customerId_roleId_key" ON "StaffTeachingRole"("customerId", "roleId");

-- CreateIndex
CREATE INDEX "Class_teachingRoleId_idx" ON "Class"("teachingRoleId");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teachingRoleId_fkey" FOREIGN KEY ("teachingRoleId") REFERENCES "TeachingRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingRole" ADD CONSTRAINT "TeachingRole_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTeachingRole" ADD CONSTRAINT "StaffTeachingRole_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTeachingRole" ADD CONSTRAINT "StaffTeachingRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TeachingRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
