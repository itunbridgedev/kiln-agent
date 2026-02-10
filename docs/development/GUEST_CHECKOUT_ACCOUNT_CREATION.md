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

1. Redirect to OAuth provider
2. User completes OAuth flow
3. Callback includes:
   - OAuth email
   - OAuth user info (name, picture, etc.)
4. Check if account exists for that email
5. If new:
   - Create Customer account with OAuth provider
   - Link classRegistration to new customerId
6. If existing:
   - Add OAuth provider to existing account
   - (Already linked to registration if same email)
7. Create JWT session
8. Redirect to `/my-classes`

**Key Configuration:**
- Apple OAuth callback should include email in ID token
- Google OAuth should request email scope
- Verify guest email matches OAuth email (or allow override for OAuth non-email accounts)

### Phase 5: Post-Creation Flow

**After Account Creation:**
1. Auto-login (set JWT token/session)
2. Redirect to `/my-classes`
3. Show success toast: "Account created! Your booking is now in your account."
4. Display booking with new account features available

---

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

### Sprint 1: Foundation
1. Create `GuestAccountCreation.tsx` component
2. Add to confirmation page
3. Implement password-based account creation
4. Backend endpoint for guest registration
5. Testing with password flow

### Sprint 2: OAuth Integration
1. Wire up Apple OAuth callback for account creation
2. Wire up Google OAuth callback for account creation
3. Handle account linking for existing users
4. Test full OAuth flows
5. Auto-login after OAuth account creation

### Sprint 3: Polish & Testing
1. Success/error messaging
2. Email confirmation on account creation
3. Redirect flow to `/my-classes`
4. E2E testing
5. Mobile responsiveness

---

## Success Metrics

- Track how many guests create accounts after booking
- Measure time from confirmation to account creation
- Monitor failed account creation attempts
- Track OAuth vs password preference
- Measure post-creation engagement (browsing classes, future bookings)

---

## Future Enhancements

1. **Account Name**: Pre-fill with `guestName` from registration
2. **Email Verification**: Optional step for account verification
3. **Referral Program**: Offer discount/rewards for creating account
4. **Social Proof**: Show how many guests have created accounts
5. **Account Invitations**: Send account setup email with special link
6. **Login Recovery**: If guest loses login, can recover via email
7. **Multi-Registration Link**: If same email books multiple classes, consolidate

---

## Related Files to Update

- `web/app/registrations/[id]/page.tsx` - Confirmation page
- `src/routes/auth.ts` - Backend auth routes
- `src/config/passport.ts` - OAuth strategy configurations
- Prisma schema - May need to enhance Customer model
- API error handling - For validation during account creation

