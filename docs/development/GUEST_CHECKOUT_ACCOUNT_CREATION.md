# Guest Checkout Confirmation & Account Creation Flow

## Overview

This document details the complete guest checkout flow for one-off classes like "Date Night," with special emphasis on:
- Creating a smooth booking confirmation experience
- Inviting guests to create an account to manage their reservation(s)
- Offering multiple account creation methods (password, Apple OAuth, Google OAuth)
- Linking the guest booking to the newly created account

## Current State

### What Exists
- **Guest Checkout**: Guests can provide name, email, and phone to book a class
- **Payment Processing**: Stripe integration handles payment for guest bookings
- **Registration Confirmation Page**: `/registrations/[id]/page.tsx` displays booking confirmation
- **Guest Data Storage**: Registrations store `guestName`, `guestEmail`, `guestPhone` fields
- **OAuth Setup**: Apple and Google OAuth are configured in the backend

### What's Missing
- Account creation flow on confirmation page
- Invitation/CTA for guests to create account
- Modal/page for account creation with multiple auth methods
- Linking guest bookings to newly created accounts
- Onboarding experience after account creation

---

## User Flow

### Guest Path: Browse → Pay → Confirm → Create Account

```
1. Browse Classes
   ↓
2. Select Session & Guest Count
   ↓
3. Continue as Guest (provide name, email, phone)
   ↓
4. Payment (Stripe)
   ↓
5. Confirmation Page (SUCCESS!)
   ↓
6. [NEW] Account Creation Invitation
   ├─ Create with Password
   │  └─ Set password for email@example.com
   │     ↓
   │     Account created, logged in, redirect to /my-classes
   │
   └─ Create with Apple/Google
      └─ Click "Sign in with Apple/Google"
         ↓
         Account created/linked, logged in, redirect to /my-classes
```

---

## Technical Implementation

### Phase 1: Confirmation Page Enhancement

**File**: `web/app/registrations/[id]/page.tsx`

#### Current State
- Displays registration details, payment status, session info
- Shows guest name/email if applicable
- Links to class/booking management

#### Enhancements
```tsx
// Check if user is authenticated vs guest
const isGuestBooking = registration.guestEmail && !user;

// If guest booking, show account creation section
{isGuestBooking && (
  <AccountCreationSection
    email={registration.guestEmail}
    onAccountCreated={handleAccountCreated}
  />
)}
```

**New UI Sections:**
1. **Account Creation Invitation Card**
   - Headline: "Manage Your Reservation"
   - Description: "Create an account to easily manage your booking and see upcoming classes"
   - Show guest email address
   - Call-to-action buttons for each auth method

2. **Account Creation Modal/Page**
   - Appears inline or as modal on confirmation page
   - Options: Password, Apple, Google

### Phase 2: Account Creation Component

**New File**: `web/components/auth/GuestAccountCreation.tsx`

```tsx
interface GuestAccountCreationProps {
  email: string;
  registrationId: number;
  onSuccess?: (user: any) => void;
  onCancel?: () => void;
}

export default function GuestAccountCreation({
  email,
  registrationId,
  onSuccess,
  onCancel,
}: GuestAccountCreationProps) {
  // Component features:
  // 1. Display email (read-only or confirm)
  // 2. Three tabs/buttons for auth methods:
  //    - Password method
  //    - Apple OAuth
  //    - Google OAuth
  // 3. Handle account creation
  // 4. Link guest registration to account
  // 5. Auto-login and redirect
}
```

#### Password Tab
- Input field for password (with strength indicator)
- Confirm password field
- "Create Account" button
- API call to register endpoint with OAuth-style response

#### Apple/Google Tabs
- Click to initiate OAuth flow
- Handle callback
- Create account if new user
- Link account if existing user

### Phase 3: Backend Account Creation Endpoints

**API Endpoint**: `POST /api/auth/register-guest`

```typescript
// Request body
{
  email: "guest@example.com",
  password: "securePassword123",  // Optional - if using password method
  name: "Guest Name",              // Optional - from registration
  registrationId: 123,             // Link to guest booking
}

// Response
{
  success: true,
  user: {
    id: 123,
    email: "guest@example.com",
    name: "Guest Name",
  },
  session: "jwt-token-here",
}
```

**Endpoint Features:**
1. Validate email matches registration's guestEmail
2. Validate password if provided
3. Create Customer record with account
4. Link ClassRegistration to customerId
5. Create session/JWT token for auto-login
6. Return authenticated response

### Phase 4: OAuth Integration for Account Creation

**For both Apple & Google OAuth:**

When guest clicks "Sign in with Apple/Google":

1. **Redirect to OAuth Provider**
   - Include return URL with registration ID and guest email
   - Store guest registration info in sessionStorage

2. **OAuth Provider Callback**
   - Return to `/api/auth/apple/callback` or `/api/auth/google/callback`
   - Extract OAuth user data (email, name, picture, tokens)
   - Encode OAuth data in callback redirect to linking page

3. **Smart Email Linking** ✅ **COMPLETED**
   - **If emails match** (OAuth email = guest email):
     - Auto-link silently, no user prompt needed
     - Redirect to `/my-classes` with success message
   
   - **If emails differ**:
     - Show `/auth/link-oauth-account` choice page
     - Two options:
       1. Link to guest booking (use guest email)
       2. Create new account (use OAuth email)
     - User chooses, endpoint links registration and logs in

4. **Account Creation & Registration Linking**
   - Create or find OAuth account
   - Link ClassRegistration to customer account
   - Auto-login user
   - Redirect to `/my-classes`

**Key Configuration:**
- Apple OAuth must include email in ID token
- Google OAuth must request email scope
- Return URL preserves registration context
- OAuth data passed via URL params (safely encoded)

### Phase 5: Post-Creation Flow

**After Account Creation:**
1. Auto-login (set JWT token/session)
2. Redirect to `/my-classes`
3. Show success toast: "Account created! Your booking is now in your account."
4. Display booking with new account features available

---

## Account Recovery (Password Reset) - ✅ COMPLETED

Account recovery allows guests who created password-protected accounts to reset their password if forgotten.

### Implementation Details

**Frontend:**
- `web/app/auth/password-reset/page.tsx` - Two-step reset flow
  1. Request reset: User enters email
  2. Reset password: User validates token and sets new password
  
**Backend Endpoints:**
- `POST /api/auth/request-password-reset` - Generate 1-hour reset token
- `POST /api/auth/reset-password` - Validate token and update password

**Database:**
- `passwordResetToken` (String?) - Hash of the reset token
- `passwordResetExpires` (DateTime?) - Token expiration time

**Security Features:**
- Time-limited tokens (1 hour expiration)
- Token hashing for secure storage
- Password strength validation on reset
- Email existence check (silent fail for privacy)

**UI Integration:**
- "Forgot password?" link on login form
- Accessible at `/auth/password-reset`
- Support for both email request and token reset flows
- Clear success/error messaging

### Email Integration (TODO)
When email service is configured (nodemailer, sendgrid, etc.):
```typescript
// Send password reset email with token link
const resetUrl = `${CLIENT_URL}/auth/password-reset?token=${token}`;
await sendEmail({
  to: user.email,
  subject: 'Password Reset Request',
  template: 'password-reset',
  data: { name: user.name, resetUrl, expiresIn: '1 hour' }
});
```

---

## Smart OAuth Email Linking - ✅ COMPLETED

A critical feature for converting guests to registered users when their OAuth email may differ from their guest booking email.

### The Problem
- Guest books as `guest@example.com` without account
- Guest later tries to create account via Apple/Google
- Apple/Google account might use `different@example.com`
- System needs to decide: Link to guest booking or create separate account?

### The Solution: Smart Linking

```
Guest Checkout Flow:
│
├─ Book as Guest: guest@example.com
│  └─ Registration created with guestEmail
│
├─ Try OAuth (Apple/Google)
│  └─ Reddit to OAuth provider
│     └─ OAuth callback with oauthEmail
│
├─ Email Comparison
│  │
│  ├─ IF oauthEmail = guestEmail
│  │  └─ Auto-link silently → /my-classes ✓
│  │
│  └─ IF oauthEmail ≠ guestEmail
│     └─ Show choice page → Decide action
│        ├─ Link to guest booking (use guestEmail)
│        │  └─ Keep original booking, add OAuth auth method
│        │
│        └─ Create new account (use oauthEmail)
│           └─ Create separate account, original booking stays guest
```

### Implementation Details

**Frontend Page**: `/auth/link-oauth-account`
- Auto-link scenario: Show success + redirect (1.5s)
- Choice scenario: Present two buttons with clear descriptions
- Email mismatch display: Show both emails side-by-side
- Error handling: Display any issues with suggestions

**Backend Endpoint**: `POST /api/auth/link-oauth-to-guest`
- Accept: `registrationId`, `provider`, `oauthData`, `linkExistingEmail`
- Verify registration exists and guest email is valid
- Create/find OAuth account
- Link registration to account
- Auto-login and return authenticated user
- Support both Apple and Google OAuth

**Security Measures**
- Email ownership already verified by OAuth provider
- Registration verified against ID
- Time-limited session tokens
- Secure session cookie handling

### User Experience
- **Happy path** (emails match): Invisible, seamless conversion
- **Alternative path** (emails differ): Clear choice, no confusion
- **Edge case** (multiple addresses): User can link to guest or create new

### Benefits
✅ Maximum flexibility for users  
✅ No forced email changes  
✅ Transparent about linking decisions  
✅ Can support multiple accounts per user later  
✅ Respects user privacy and preference  

---

## Post-Creation Flow

## UI Design

### Confirmation Page Layout

```
┌─────────────────────────────────────────────┐
│ Header with Logo                            │
├─────────────────────────────────────────────┤
│ ✓ Booking Confirmed!                        │
│                                             │
│ Registration Details                        │
│ ├─ Class: Date Night Pottery                │
│ ├─ Date: Saturday, Feb 15, 2025             │
│ ├─ Time: 6:00 PM - 8:00 PM                  │
│ ├─ Location: Studio Address                 │
│ └─ Amount: $125.00                          │
│                                             │
│ Confirmation Email Sent to:                 │
│ └─ guest@example.com                        │
│                                             │
├─────────────────────────────────────────────┤
│ [NEW] Create Account Section                │
├─────────────────────────────────────────────┤
│ 📧 Manage Your Reservation                  │
│                                             │
│ Create a free account to easily manage      │
│ your booking and see upcoming classes.      │
│                                             │
│ Email: guest@example.com ✓                  │
│                                             │
│ ┌──────────────────────────────────────┐   │
│ │ [🔐] Create with Password            │   │
│ └──────────────────────────────────────┘   │
│                                             │
│ ┌──────────────────────────────────────┐   │
│ │ [🍎] Sign in with Apple              │   │
│ └──────────────────────────────────────┘   │
│                                             │
│ ┌──────────────────────────────────────┐   │
│ │ [🔵] Sign in with Google             │   │
│ └──────────────────────────────────────┘   │
│                                             │
│ Or [Skip for now] (small link)              │
│                                             │
├─────────────────────────────────────────────┤
│ [Browse More Classes]    [Back to Home]     │
└─────────────────────────────────────────────┘
```

### Password Creation Modal

```
┌──────────────────────────────┐
│ Create Account               │
├──────────────────────────────┤
│                              │
│ Email: guest@example.com     │
│ (This matches your booking)  │
│                              │
│ Password                     │
│ [________________]           │
│ ✓ 8+ characters             │
│ ✓ Contains letter & number   │
│ ✓ Contains lowercase & upper │
│                              │
│ Confirm Password             │
│ [________________]           │
│                              │
│ [ Back ]  [ Create Account ] │
├──────────────────────────────┤
│ Or sign in with              │
│ [Apple] [Google]             │
└──────────────────────────────┘
```

---

## Security Considerations

### Email Verification
- Do NOT require email verification for guest account creation
- Guest already verified email by receiving confirmation
- Can add optional verification step later if needed

### Password Requirements
- Minimum 8 characters
- At least one letter and one number
- Consider adding strength indicator

### OAuth Account Linking
- If email matches existing account, offer to link OAuth method
- Ensure email ownership matches between OAuth and registration

### Session Management
- After account creation, auto-create session token
- Set secure, httpOnly cookie
- Include in response for immediate frontend use
- Remember auth state for redirect

---

## Implementation Sequence

### Sprint 1: Foundation ✅ COMPLETED
1. ✅ Create `GuestAccountCreation.tsx` component
2. ✅ Add to confirmation page
3. ✅ Implement password-based account creation
4. ✅ Backend endpoint for guest registration
5. ✅ Testing with password flow

### Sprint 2: OAuth Integration + Account Recovery ✅ COMPLETED
1. ✅ Wire up Apple OAuth callback for account creation
2. ✅ Wire up Google OAuth callback for account creation
3. ✅ Handle account linking for existing users
4. ✅ Test full OAuth flows
5. ✅ Auto-login after OAuth account creation
6. ✅ **NEW**: Smart email linking (auto-link or choose)
7. ✅ Create password reset flow
8. ✅ Add reset endpoints & token management
9. ✅ Test account recovery

### Sprint 3: Polish & Testing — IN PROGRESS
1. ✅ Success/error messaging (inline in GuestAccountCreation component)
2. ⬜ Email service integration (nodemailer/sendgrid) — needed for:
   - Account creation confirmation emails
   - Password reset emails (endpoint exists, just logs token to console)
3. ✅ Redirect flow to `/my-classes` after account creation
4. 🟡 E2E testing — `tests/e2e/guest-registration.spec.ts` created but **currently failing**
   - Test hardcodes `registrationId = 10` (brittle, needs seed data or dynamic setup)
   - `.last-run.json` shows `"status": "failed"`
   - Test artifacts (playwright-report/, test-results/) were committed — should be gitignored
5. ⬜ Mobile responsiveness — needs manual verification
6. ⬜ Clean up committed test artifacts (playwright-report/, test-results/) and add to `.gitignore`

### Known Issues & Tech Debt
- **API URL inconsistency**: Confirmation page (`registrations/[id]/page.tsx`) uses `NEXT_PUBLIC_API_URL` (absolute), while `GuestAccountCreation.tsx` uses relative paths (empty string). Should standardize on relative paths via Next.js rewrites.
- **Test artifacts committed**: `playwright-report/` and `test-results/` directories were committed in `60072cf` — need to be removed from tracking and gitignored.
- **Password reset email not wired**: `POST /api/auth/request-password-reset` generates a token but only logs it. Needs actual email delivery once email service is configured.
- **E2E test fragility**: Test relies on `registrationId = 10` existing in local DB as a guest booking.

---

## Success Metrics

- Track how many guests create accounts after booking
- Measure time from confirmation to account creation
- Monitor failed account creation attempts
- Track OAuth vs password preference
- Measure post-creation engagement (browsing classes, future bookings)

---

## Future Enhancements

1. **Email Service Integration**: Wire up nodemailer/sendgrid for transactional emails (password reset, account creation confirmation)
2. **Account Name**: Pre-fill with `guestName` from registration
3. **Referral Program**: Offer discount/rewards for creating account
4. **Social Proof**: Show how many guests have created accounts
5. **Account Invitations**: Send account setup email with special link
6. ✅ **Login Recovery**: If guest loses login, can recover via email - **COMPLETED**
7. ✅ **Smart OAuth Linking**: Seamless email matching & choice flow - **COMPLETED**
8. **Multi-Account Management**: Let users manage multiple email accounts
9. **Multi-Registration Link**: If same email books multiple classes, consolidate

---

## Implemented Files

### Frontend
- `web/components/auth/GuestAccountCreation.tsx` — Main account creation component (password + OAuth)
- `web/app/registrations/[id]/page.tsx` — Confirmation page with account creation CTA
- `web/app/auth/link-oauth-account/page.tsx` — Smart OAuth email linking page
- `web/app/auth/password-reset/page.tsx` — Password reset flow (request + reset)
- `web/components/auth/LoginForm.tsx` — Added "Forgot password?" link

### Backend
- `src/routes/auth.ts` — Added endpoints: register-guest, link-oauth-to-guest, request-password-reset, reset-password; updated Apple/Google OAuth callbacks
- `src/utils/auth.ts` — Auth utility helpers extracted for reuse
- `prisma/schema.prisma` — Added passwordResetToken + passwordResetExpires to Customer

### Tests
- `tests/e2e/guest-registration.spec.ts` — E2E test for guest account creation (needs fixing)

