# Deployment Checklist - feature/classes-module to DEV

## ✅ Completed
- [x] Committed all changes to feature/phase-3d-customer-registration
- [x] Merged feature/phase-3d-customer-registration into feature/classes-module
- [x] Pushed feature/classes-module to GitHub

## 🚀 Next Steps

### 1. Deploy to DEV Environment

Depending on your CI/CD setup:

**Option A: Automatic Deployment**
If you have CI/CD configured:
- Push triggers automatic deployment to DEV
- Monitor deployment logs for success

**Option B: Manual Deployment**
```bash
# If using Heroku
git push heroku-dev feature/classes-module:main

# If using Render/Railway
# Deployment should trigger automatically from GitHub
# Or manually trigger from dashboard
```

### 2. Run Database Migrations

**Critical:** Run migrations on DEV database:

```bash
# If using Heroku
heroku run npx prisma migrate deploy -a your-dev-app-name

# If using Render
# Run via SSH or dashboard terminal
npx prisma migrate deploy

# Or use connection string
DATABASE_URL="your-dev-db-url" npx prisma migrate deploy
```

**Migrations to apply:**
- `20260128194643_add_customer_registration` - ClassRegistration, payment fields
- `20260129002005_add_resource_allocation` - Resources and allocations
- `20260131202430_add_stripe_connect` - Stripe Connect integration

### 3. Configure Environment Variables

Ensure DEV has these variables:

```bash
# Stripe (TEST MODE)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From webhook setup

# Stripe Connect (optional for MVP)
STRIPE_PLATFORM_FEE_PERCENTAGE=0.05

# Database
DATABASE_URL=postgresql://...
DATABASE_URL_WITH_SSL=postgresql://...

# App URLs
CLIENT_URL=https://your-dev-frontend-url.com
```

### 4. Configure Stripe Webhooks

Follow the guide in `docs/setup/WEBHOOK_SETUP_DEV.md`:

**Quick Steps:**
1. Go to https://dashboard.stripe.com/test/webhooks
2. Add endpoint: `https://your-dev-api-url.com/api/stripe/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated`
4. Copy signing secret
5. Add to DEV environment: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 5. Seed Database (Optional)

If starting fresh:

```bash
# Run multi-tenant seed script
heroku run npm run seed:multi-tenant -a your-dev-app-name
# OR
npx ts-node prisma/seed-multi-tenant.ts
```

This creates:
- Demo studio
- Sample classes (Beginner Wheel Throwing, etc.)
- Class sessions with schedule patterns
- Resources (potter's wheels, kilns)
- Admin user

### 6. Verify Deployment

**Test Checklist:**

- [ ] Frontend loads: `https://your-dev-frontend-url.com`
- [ ] Backend responds: `https://your-dev-api-url.com/api/studio`
- [ ] Login works with admin@kilnagent.com
- [ ] Classes page loads and shows classes
- [ ] Can view class details
- [ ] Can book a class as guest
- [ ] Payment form loads (Stripe Elements)
- [ ] Test payment succeeds (4242 4242 4242 4242)
- [ ] Confirmation page shows
- [ ] Registration appears in My Bookings
- [ ] Admin calendar shows session
- [ ] Webhook receives events in Stripe Dashboard

### 7. Test Complete Payment Flow

**End-to-End Test:**

1. **Browse Classes**
   - Go to /classes
   - See "Beginner Wheel Throwing" class

2. **Book Session**
   - Click class → Book Now
   - Select Monday Feb 2, 12:00-14:00 session
   - Guest count: 1

3. **Continue as Guest**
   - Name: Test User
   - Email: test@example.com
   - Phone: 555-123-4567

4. **Payment**
   - Card: 4242 4242 4242 4242
   - Expiry: 12/26
   - CVV: 123
   - ZIP: 12345
   - Click "Pay $250.00"

5. **Verify Success**
   - Redirects to /registrations/[id]
   - Shows confirmation
   - Status: CONFIRMED
   - Payment Status: COMPLETED

6. **Check Stripe Dashboard**
   - Go to Payments (test mode)
   - See $250.00 payment
   - Status: Succeeded

7. **Check Webhooks**
   - Go to Webhooks → Your endpoint
   - See `payment_intent.succeeded` event
   - Status: 200 OK

### 8. Test Refund Flow

1. **Issue Refund in Stripe**
   - Find payment in Dashboard
   - Click "Refund payment"
   - Refund full amount

2. **Verify Webhook**
   - Check webhook events
   - See `charge.refunded` event
   - Status: 200 OK

3. **Check Registration**
   - Reload registration page
   - Payment Status: REFUNDED
   - Refund Amount: $250.00
   - Refunded At: [timestamp]

## 📊 Monitoring

After deployment, monitor:

1. **Application Logs**
   ```bash
   heroku logs --tail -a your-dev-app-name
   # Look for errors, payment flows, webhook events
   ```

2. **Stripe Dashboard**
   - Webhook delivery success rate
   - Failed events
   - Payment volume

3. **Database**
   - ClassRegistration records
   - Payment statuses
   - Session enrollments

## 🐛 Troubleshooting

### Payment Fails

**Check:**
- Stripe publishable key is test mode (pk_test_)
- Frontend can reach backend
- CORS configured correctly
- Payment intent creates successfully

**Debug:**
```bash
# Check backend logs
heroku logs --tail -a your-dev-app-name | grep payment
```

### Webhook Not Working

**Verify:**
- Webhook URL is correct
- Signing secret matches Stripe Dashboard
- Backend is accessible from internet
- Events are being sent from Stripe

**Test:**
```bash
# Test endpoint directly
curl https://your-dev-api-url.com/api/stripe/webhook
# Should return 400 (signature required)
```

### Database Issues

**Check migrations:**
```bash
heroku run npx prisma migrate status -a your-dev-app-name
```

**Reset if needed:**
```bash
# ⚠️ ONLY FOR DEV - This deletes all data
heroku run npx prisma migrate reset -a your-dev-app-name
```

## 📝 Post-Deployment Notes

Document:
- [ ] DEV URL: ______________________
- [ ] Webhook endpoint ID: ______________________
- [ ] Deployment date: ______________________
- [ ] Any issues encountered: ______________________
- [ ] Test results: ______________________

## 🎯 Success Criteria

Deployment is successful when:
- ✅ All migrations applied
- ✅ Frontend loads without errors
- ✅ Can complete full booking flow
- ✅ Payment processes successfully
- ✅ Webhooks receive events
- ✅ Refunds update registrations
- ✅ No critical errors in logs

## Next: STAGING & PROD

After DEV is stable:
1. Merge feature/classes-module → staging
2. Deploy to STAGING environment
3. Run full QA testing
4. Merge staging → main
5. Deploy to PROD with live Stripe keys

---

**Current Status:** Ready to deploy to DEV
**Branch:** feature/classes-module
**Commit:** 4e42536 (Fix payment flow)
**Date:** February 2, 2026
