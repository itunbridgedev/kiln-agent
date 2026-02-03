-- CreateTable
CREATE TABLE "ClassSessionInstructor" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "roleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSessionInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSessionAssistant" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "roleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSessionAssistant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassSessionInstructor_sessionId_idx" ON "ClassSessionInstructor"("sessionId");

-- CreateIndex
CREATE INDEX "ClassSessionInstructor_customerId_idx" ON "ClassSessionInstructor"("customerId");

-- CreateIndex
CREATE INDEX "ClassSessionInstructor_roleId_idx" ON "ClassSessionInstructor"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSessionInstructor_sessionId_customerId_key" ON "ClassSessionInstructor"("sessionId", "customerId");

-- CreateIndex
CREATE INDEX "ClassSessionAssistant_sessionId_idx" ON "ClassSessionAssistant"("sessionId");

-- CreateIndex
CREATE INDEX "ClassSessionAssistant_customerId_idx" ON "ClassSessionAssistant"("customerId");

-- CreateIndex
CREATE INDEX "ClassSessionAssistant_roleId_idx" ON "ClassSessionAssistant"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSessionAssistant_sessionId_customerId_key" ON "ClassSessionAssistant"("sessionId", "customerId");

-- AddForeignKey
ALTER TABLE "ClassSessionInstructor" ADD CONSTRAINT "ClassSessionInstructor_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSessionInstructor" ADD CONSTRAINT "ClassSessionInstructor_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSessionInstructor" ADD CONSTRAINT "ClassSessionInstructor_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TeachingRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSessionAssistant" ADD CONSTRAINT "ClassSessionAssistant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSessionAssistant" ADD CONSTRAINT "ClassSessionAssistant_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSessionAssistant" ADD CONSTRAINT "ClassSessionAssistant_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TeachingRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
