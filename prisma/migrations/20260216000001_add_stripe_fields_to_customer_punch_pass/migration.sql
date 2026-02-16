-- AlterTable CustomerPunchPass to add Stripe payment tracking fields
ALTER TABLE "CustomerPunchPass" ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT;

-- Create index on stripeCheckoutSessionId for efficient payment lookups
CREATE INDEX "CustomerPunchPass_stripeCheckoutSessionId_idx" ON "CustomerPunchPass"("stripeCheckoutSessionId");
