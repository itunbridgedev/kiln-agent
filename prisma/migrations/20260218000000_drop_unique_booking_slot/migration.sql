-- DropIndex
DROP INDEX IF EXISTS "OpenStudioBooking_sessionId_resourceId_startTime_key";

-- CreateIndex (non-unique replacement)
CREATE INDEX IF NOT EXISTS "OpenStudioBooking_sessionId_resourceId_startTime_idx" ON "OpenStudioBooking"("sessionId", "resourceId", "startTime");
