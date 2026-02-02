# Stripe Connect Integration - Quick Reference

## Overview

Complete Stripe Connect integration for multi-tenant pottery studio platform. Studios can onboard their Stripe accounts and accept payments for class registrations.

## What Was Implemented

### Backend (API)

#### Database Changes

- **Migration**: `20260131202430_add_stripe_connect`
- **Studio Model**: Added Stripe Connect fields
  - `stripeAccountId` - Unique Stripe Connect account ID
  - `stripeAccountStatus` - Onboarding status (not_started, pending, complete)
  - `stripeOnboardedAt` - Completion timestamp
  - `stripeDetailsSubmitted` - KYC/business details submitted
  - `stripeChargesEnabled` - Can accept payments
  - `stripePayoutsEnabled` - Can receive payouts

- **ClassRegistration Model**: Added payment tracking
  - `stripeChargeId` - Stripe charge ID
  - `stripeTransferId` - Transfer to studio account ID
  - `stripeFeeAmount` - Platform fee taken
  - `studioPayoutAmount` - Amount sent to studio

#### Services (`src/services/stripe.ts`)

- `createConnectAccount()` - Create Express account for studio
- `createAccountLink()` - Generate onboarding URL
- `getAccountStatus()` - Check Connect account status
- `syncStudioAccountStatus()` - Update DB with latest Stripe status
- `createPaymentIntent()` - Create payment with destination charge
- `getPaymentIntent()` - Retrieve payment details
- `createRefund()` - Issue full or partial refund
- `createLoginLink()` - Generate Dashboard login URL
- `handleWebhookEvent()` - Process webhook notifications
- `constructWebhookEvent()` - Verify webhook signature

#### Routes

**Connect Onboarding** (`src/routes/stripe-connect.ts`):

- `POST /api/stripe/connect/onboard` - Start onboarding (Admin only)
- `GET /api/stripe/connect/status` - Get current status (Admin only)
- `POST /api/stripe/connect/dashboard` - Get Dashboard link (Admin only)
- `POST /api/stripe/connect/refresh` - Refresh onboarding link (Admin only)

**Payment Processing** (`src/routes/stripe-payment.ts`):

- `POST /api/stripe/payment/create-intent` - Create PaymentIntent
- `POST /api/stripe/payment/confirm` - Confirm payment & create registration
- `POST /api/stripe/payment/refund` - Issue refund (Admin only)

**Webhooks** (`src/routes/stripe-webhook.ts`):

- `POST /api/stripe/webhook` - Handle Stripe events (uses raw body)

### Frontend (Web)

#### Components

**StripeCheckout** (`web/components/stripe/StripeCheckout.tsx`):

```tsx
import StripeCheckout from "@/components/stripe/StripeCheckout";

<StripeCheckout
  classId={classId}
  sessionId={sessionId} // Optional for single session
  registrationType="SINGLE_SESSION" // or "SERIES" or "DROP_IN"
  guestCount={1}
  onSuccess={(registrationId) => {
    // Handle successful payment
    router.push(`/registrations/${registrationId}`);
  }}
  onCancel={() => {
    // Handle cancellation
    router.back();
  }}
/>;
```

**StripeConnectOnboarding** (`web/components/stripe/StripeConnectOnboarding.tsx`):

```tsx
import StripeConnectOnboarding from "@/components/stripe/StripeConnectOnboarding";

// In admin settings page
<StripeConnectOnboarding />;
```

## Usage Examples

### Studio Admin: Connect Stripe Account

1. Navigate to `/admin/settings/payments`
2. Render `<StripeConnectOnboarding />` component
3. Admin clicks "Connect with Stripe"
4. Redirected to Stripe Express onboarding
5. Complete business info, banking details, identity verification
6. Redirected back to app
7. Status automatically syncs and displays

### Customer: Book a Class

```tsx
"use client";

import { useState } from "react";
import StripeCheckout from "@/components/stripe/StripeCheckout";

export default function BookingPage({ classId }: { classId: number }) {
  const [showCheckout, setShowCheckout] = useState(false);

  if (showCheckout) {
    return (
      <StripeCheckout
        classId={classId}
        registrationType="SERIES"
        guestCount={1}
        onSuccess={(registrationId) => {
          window.location.href = `/registrations/${registrationId}`;
        }}
        onCancel={() => setShowCheckout(false)}
      />
    );
  }

  return (
    <button onClick={() => setShowCheckout(true)}>Register for Class</button>
  );
}
```

### Admin: Issue Refund

```tsx
const issueRefund = async (registrationId: number) => {
  const response = await fetch("/api/stripe/payment/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      registrationId,
      reason: "requested_by_customer",
    }),
  });

  const data = await response.json();
  if (data.success) {
    alert(`Refund issued: $${data.amount}`);
  }
};
```

## Environment Variables

### Backend (.env)

```bash
STRIPE_SECRET_KEY="sk_test_..." # or sk_live_ for production
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PLATFORM_FEE_PERCENTAGE="0.05" # 5% platform fee
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." # or pk_live_ for production
```

## Payment Flow

1. **Customer initiates booking**
   - Clicks "Register" on class page
   - Fills in booking details

2. **Create PaymentIntent**
   - Frontend calls `POST /api/stripe/payment/create-intent`
   - Backend creates PaymentIntent with studio as destination
   - Returns `clientSecret` to frontend

3. **Customer pays**
   - Frontend renders Stripe Elements
   - Customer enters card details
   - Stripe processes payment

4. **Confirm registration**
   - Frontend calls `POST /api/stripe/payment/confirm`
   - Backend verifies payment succeeded
   - Creates ClassRegistration record
   - Links to session(s) if applicable

5. **Webhook notification**
   - Stripe sends `payment_intent.succeeded` event
   - Backend updates registration status
   - Records charge ID and transfer details

6. **Studio receives funds**
   - Stripe automatically transfers funds to studio account
   - Minus platform fee (5%)
   - According to payout schedule (daily/weekly/monthly)

## Platform Fee Calculation

Example with 5% platform fee:

- Class price: $100
- Guest count: 1
- **Total charged**: $100
- **Platform fee**: $5 (5%)
- **Studio receives**: $95

The calculation happens automatically in `createPaymentIntent()`:

```typescript
const platformFee = Math.round(amount * PLATFORM_FEE_PERCENTAGE);
```

## Webhook Events Handled

- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `account.updated` - Connect account status changed
- `charge.refunded` - Refund issued

## Security Notes

1. **Never expose secret keys** - Use environment variables only
2. **Verify webhooks** - Always check signature with webhook secret
3. **HTTPS required** - Stripe requires secure connections
4. **PCI compliance** - Stripe handles card data, never store cards

## Testing

### Test Card Numbers

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 9995`
- 3D Secure: `4000 0025 0000 3155`

### Stripe CLI for Local Webhooks

```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

## Common Issues

### "Studio has not completed Stripe Connect onboarding"

- Solution: Studio admin must complete onboarding via Connect UI
- Check: `stripeChargesEnabled` should be `true`

### Webhook signature verification failed

- Solution: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Check: Raw body parser must be used for webhook endpoint

### PaymentIntent creation fails

- Solution: Ensure studio has `stripeAccountId` and charges enabled
- Check: Amount must be at least $0.50 USD

## Next Steps

1. **Set up Stripe account** - Create test account at stripe.com
2. **Configure environment variables** - Add API keys to .env files
3. **Test onboarding** - Admin connects Stripe account
4. **Test payment flow** - Book a class with test card
5. **Set up webhooks** - Configure webhook endpoint in Stripe Dashboard
6. **Go live** - Switch to live API keys when ready

## Documentation

- Full setup guide: `docs/setup/STRIPE_SETUP.md`
- Stripe Connect docs: https://stripe.com/docs/connect
- Test cards: https://stripe.com/docs/testing

## Support Contacts

- Stripe Support: https://support.stripe.com
- Platform Admin: [Your support email]
