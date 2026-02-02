# Stripe Connect Setup Guide

Stripe Connect integration has been fully implemented in the Pottery Studio App. This guide covers setup for accepting payments through the multi-tenant platform.

## Overview

We use **Stripe Connect** with the Express account type to enable each studio to receive payments directly. The platform takes a configurable percentage as a platform fee (default 5%).

**Architecture:**

- **Express Accounts**: Studios use Stripe Express accounts for quick onboarding
- **Direct Charges**: Payments are charged directly to the customer and transferred to studio accounts
- **Platform Fees**: Configurable percentage taken by the platform
- **Webhooks**: Automatic payment confirmation and status updates

## Prerequisites

- Stripe account (create at https://stripe.com)
- Access to Stripe Dashboard
- Admin access to Heroku apps (for production deployment)

## Step 1: Create Stripe Account

1. Go to https://stripe.com and sign up for an account
2. Complete your business profile
3. Verify your email address

## Step 2: Get API Keys

### Development Keys (Test Mode)

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### Production Keys (Live Mode)

1. Complete Stripe account activation (provide business details, banking info)
2. Go to https://dashboard.stripe.com/apikeys
3. Copy your **Publishable key** (starts with `pk_live_`)
4. Copy your **Secret key** (starts with `sk_live_`)

⚠️ **Important**: Never commit secret keys to version control!

## Step 3: Configure Webhook Endpoint

Webhooks notify your application of payment events.

### Development (Local Testing with Stripe CLI)

Install Stripe CLI:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.0/stripe_1.19.0_linux_x86_64.tar.gz
tar -xvf stripe_1.19.0_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

Forward webhooks to local development:

```bash
stripe login
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

The CLI will output a webhook signing secret (starts with `whsec_`).

### Production Webhook Setup

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter your endpoint URL:
   - **DEV**: `https://api.kilnagent-dev.com/api/stripe/webhook`
   - **STAGING**: `https://api.kilnagent-stage.com/api/stripe/webhook`
   - **PROD**: `https://api.kilnagent.com/api/stripe/webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `charge.refunded`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

## Step 4: Configure Environment Variables

### Local Development

Add to `/api/.env.development`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_YOUR_TEST_SECRET_KEY"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET"
STRIPE_PLATFORM_FEE_PERCENTAGE="0.05"
```

Add to `/web/.env.local`:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_TEST_PUBLISHABLE_KEY"
```

### Heroku Deployment

#### DEV Environment

```bash
# Backend
heroku config:set \
  STRIPE_SECRET_KEY="sk_test_YOUR_TEST_SECRET_KEY" \
  STRIPE_WEBHOOK_SECRET="whsec_YOUR_DEV_WEBHOOK_SECRET" \
  STRIPE_PLATFORM_FEE_PERCENTAGE="0.05" \
  --app kilnagent-dev-api

# Frontend
heroku config:set \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_TEST_PUBLISHABLE_KEY" \
  --app kilnagent-dev-web
```

#### STAGING Environment

```bash
# Backend
heroku config:set \
  STRIPE_SECRET_KEY="sk_test_YOUR_TEST_SECRET_KEY" \
  STRIPE_WEBHOOK_SECRET="whsec_YOUR_STAGING_WEBHOOK_SECRET" \
  STRIPE_PLATFORM_FEE_PERCENTAGE="0.05" \
  --app kilnagent-staging-api

# Frontend
heroku config:set \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_TEST_PUBLISHABLE_KEY" \
  --app kilnagent-staging-web
```

#### PROD Environment

⚠️ **Use LIVE keys for production!**

```bash
# Backend
heroku config:set \
  STRIPE_SECRET_KEY="sk_live_YOUR_LIVE_SECRET_KEY" \
  STRIPE_WEBHOOK_SECRET="whsec_YOUR_PROD_WEBHOOK_SECRET" \
  STRIPE_PLATFORM_FEE_PERCENTAGE="0.05" \
  --app kilnagent-api

# Frontend
heroku config:set \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_LIVE_PUBLISHABLE_KEY" \
  --app kilnagent-web
```

## Step 5: Studio Onboarding Flow

### Admin Setup

1. Studio admin logs in to their admin panel
2. Navigate to **Settings** → **Payments**
3. Click **Connect with Stripe**
4. Complete Stripe Express onboarding:
   - Business information
   - Bank account details
   - Identity verification
5. Return to the app - connection confirmed

### Onboarding States

- **not_started**: No Stripe account created
- **pending**: Account created but onboarding incomplete
- **complete**: Fully onboarded and can accept payments

## Step 6: Testing Payments

### Test Card Numbers

Stripe provides test card numbers for different scenarios:

**Successful Payment:**

- Card: `4242 4242 4242 4242`
- Any future expiration date
- Any 3-digit CVC

**Requires Authentication (3D Secure):**

- Card: `4000 0025 0000 3155`

**Payment Declined:**

- Card: `4000 0000 0000 9995`

**Insufficient Funds:**

- Card: `4000 0000 0000 9995`

Full list: https://stripe.com/docs/testing

### Test Flow

1. Browse to a class as a customer
2. Click **Register** or **Book Session**
3. Fill in registration details
4. Enter test card information
5. Complete payment
6. Verify:
   - Registration created with CONFIRMED status
   - Payment recorded in database
   - Stripe Dashboard shows payment
   - Studio account receives transfer (minus platform fee)

## API Endpoints

### Connect Onboarding

- `POST /api/stripe/connect/onboard` - Initiate Connect onboarding
- `GET /api/stripe/connect/status` - Get current Connect status
- `POST /api/stripe/connect/dashboard` - Get Stripe Dashboard login link
- `POST /api/stripe/connect/refresh` - Refresh onboarding link

### Payment Processing

- `POST /api/stripe/payment/create-intent` - Create PaymentIntent
- `POST /api/stripe/payment/confirm` - Confirm payment and create registration
- `POST /api/stripe/payment/refund` - Issue refund

### Webhooks

- `POST /api/stripe/webhook` - Handle Stripe webhook events

## Database Schema

### Studio Model

```prisma
model Studio {
  stripeAccountId     String?   @unique
  stripeAccountStatus String?   @default("not_started")
  stripeOnboardedAt   DateTime?
  stripeDetailsSubmitted Boolean @default(false)
  stripeChargesEnabled   Boolean @default(false)
  stripePayoutsEnabled   Boolean @default(false)
}
```

### ClassRegistration Model

```prisma
model ClassRegistration {
  paymentIntentId String?
  stripeChargeId  String?
  stripeTransferId String?
  stripeFeeAmount Decimal?
  studioPayoutAmount Decimal?
  paymentStatus   PaymentStatus
  refundAmount    Decimal?
  refundedAt      DateTime?
}
```

## Platform Fee Configuration

The platform fee is configurable via environment variable:

```bash
STRIPE_PLATFORM_FEE_PERCENTAGE="0.05"  # 5%
```

**How it works:**

- Customer pays: $100
- Platform fee (5%): $5
- Studio receives: $95

## Security Best Practices

1. **Protect Secret Keys**
   - Never commit to version control
   - Use environment variables
   - Rotate keys if compromised

2. **Webhook Signature Verification**
   - Always verify webhook signatures
   - Use webhook secret to validate events
   - Reject unsigned requests

3. **HTTPS Required**
   - Stripe requires HTTPS for webhooks
   - Use HTTPS for all API endpoints
   - Local development uses Stripe CLI

4. **PCI Compliance**
   - Never store card details
   - Use Stripe.js for card collection
   - Stripe handles PCI compliance

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is correct
2. Verify webhook secret matches
3. Check Heroku logs: `heroku logs --tail --app kilnagent-dev-api`
4. Test with Stripe CLI: `stripe trigger payment_intent.succeeded`

### Payment Intent Creation Fails

1. Verify studio has completed onboarding
2. Check `stripeChargesEnabled` is true
3. Verify API keys are correct
4. Check amount is at least $0.50 USD

### Connect Onboarding Issues

1. Clear browser cookies
2. Try different browser
3. Check redirect URLs are correct
4. Verify CLIENT_URL environment variable

### Common Errors

**"Studio has not completed Stripe Connect onboarding"**

- Studio admin needs to complete onboarding flow
- Check Connect status in admin panel

**"Invalid signature"**

- Webhook secret doesn't match
- Update STRIPE_WEBHOOK_SECRET

**"No such destination"**

- Studio's Stripe account ID invalid
- Re-onboard the studio

## Monitoring

### Stripe Dashboard

View all transactions, transfers, and account activity:

- DEV/Staging: https://dashboard.stripe.com/test/dashboard
- Production: https://dashboard.stripe.com/dashboard

### Studio Dashboard

Each studio can access their own dashboard:

- Click "Open Stripe Dashboard" in admin settings
- View their payments, payouts, and reports

### Application Logs

Monitor payment processing:

```bash
heroku logs --tail --app kilnagent-dev-api | grep -i stripe
```

## Going Live Checklist

Before enabling live payments:

- [ ] Activate Stripe account fully
- [ ] Update to live API keys (`sk_live_`, `pk_live_`)
- [ ] Create production webhook endpoint
- [ ] Update STRIPE_WEBHOOK_SECRET with live secret
- [ ] Test complete payment flow end-to-end
- [ ] Verify platform fee calculation
- [ ] Confirm studio receives payouts
- [ ] Set up payout schedule (daily, weekly, monthly)
- [ ] Review Stripe Dashboard
- [ ] Document support procedures
- [ ] Train studio admins on refund process

## Related Documentation

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Webhook Events](https://stripe.com/docs/api/events)
- [Testing Guide](https://stripe.com/docs/testing)

## Support

- Stripe Support: https://support.stripe.com
- Stripe Status: https://status.stripe.com
- API Support: [email protected]

## Summary

✅ **What Was Implemented:**

- Stripe Connect Express accounts for studios
- Payment Intent creation with platform fees
- Direct charge pattern (customer → platform → studio)
- Webhook handling for payment events
- Admin Connect onboarding UI
- Customer checkout with Stripe Elements
- Refund functionality
- Multi-environment support

🎯 **Result:**
Studios can now securely accept credit card payments for class registrations, with automatic payouts to their bank accounts and platform fees transparently calculated.
