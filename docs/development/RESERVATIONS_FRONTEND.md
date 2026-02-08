# Session Reservations Frontend Implementation

## Overview

Added frontend UI for customers to manage session reservations on their class registrations.

## Changes Made

### New Page: Reservation Management

**File**: `web/app/registrations/[id]/reservations/page.tsx`

A dedicated page for managing reservations on a specific registration. Features:

#### Display Features

1. **Registration Summary Card**
   - Pass type (UNLIMITED_SERIES, PUNCH_PASS, FULL_COURSE)
   - Sessions included/remaining (for punch passes)
   - Current vs max advance reservations
   - Pass validity period
   - Warning badges when limits reached

2. **Two Tab Interface**
   - **Available Sessions Tab**: Browse and reserve open sessions
   - **My Reservations Tab**: View and manage existing reservations

#### Available Sessions Tab

Shows all sessions available for reservation with:
- Date, time, and topic
- Current capacity (spots filled / total spots)
- Available spots remaining
- Reserve button (disabled if session is full, max reservations reached, or no sessions remaining)
- Visual indicators for already-reserved sessions

#### My Reservations Tab

Displays all active reservations with:
- Session date, time, and topic
- Reservation status badge (PENDING, CHECKED_IN, ATTENDED, NO_SHOW)
- Check-in window information
- Check-in button (enabled when within ±2 hours of session start)
- Cancel button (for PENDING reservations only)
- Visual indicators for punch usage

#### Actions

1. **Reserve Session**
   - POST `/api/reservations`
   - Creates new reservation
   - Validates against pass limits and session capacity
   - Refreshes available sessions and reservations list

2. **Cancel Reservation**
   - DELETE `/api/reservations/:id`
   - Confirms before canceling
   - Only available for PENDING status
   - Refreshes reservations list

3. **Check In**
   - POST `/api/reservations/:id/check-in`
   - Self-service check-in
   - Only available within check-in window (±2 hours)
   - Deducts punch for punch passes
   - Updates status to CHECKED_IN

### Updated Page: My Classes Dashboard

**File**: `web/app/my-classes/page.tsx`

Added "Manage Reservations" button to each registration card:
- Displayed for non-SINGLE_SESSION registrations
- Only shown for active (non-cancelled) registrations
- Links to `/registrations/{id}/reservations`
- Green button for clear visual hierarchy

## API Integration

### Endpoints Used

1. **GET** `/api/registrations/:id/calendar`
   - Fetches registration details with pass information
   - Returns current reservations for the registration

2. **GET** `/api/reservations/available?registrationId=:id`
   - Lists all available sessions for reservation
   - Includes capacity and availability status
   - Marks sessions already reserved by user

3. **POST** `/api/reservations`
   - Creates new reservation
   - Body: `{ registrationId, sessionId, customerNotes? }`
   - Validates pass limits and session capacity

4. **DELETE** `/api/reservations/:id`
   - Cancels existing reservation
   - Body: `{ reason?: string }`
   - Only works for PENDING status

5. **POST** `/api/reservations/:id/check-in`
   - Self-service check-in
   - Validates time window (±2 hours from session start)
   - Deducts punch if applicable

### Authentication

All API calls use:
```typescript
credentials: "include"
```

This ensures authentication cookies are sent with requests for tenant isolation and user identification.

## TypeScript Interfaces

```typescript
interface Registration {
  id: number;
  passType: string;
  sessionsIncluded: number | null;
  sessionsRemaining: number | null;
  sessionsAttended: number;
  currentReservations: number;
  maxReservations: number;
  canReserveMore: boolean;
  validFrom: string | null;
  validUntil: string | null;
  class: {
    id: number;
    name: string;
    classType: string;
  };
}

interface AvailableSession {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  topic: string | null;
  className: string;
  currentReservations: number;
  availableSpots: number;
  isAvailable: boolean;
  isReserved: boolean;
}

interface Reservation {
  id: number;
  status: string;
  reservedAt: string;
  checkedInAt: string | null;
  attendedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  noShowDetectedAt: string | null;
  punchUsed: boolean;
  customerNotes: string | null;
  session: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    topic: string | null;
    className: string;
  };
  checkInWindow?: {
    start: string;
    end: string;
    canCheckIn: boolean;
  };
}
```

## UI/UX Features

### Visual Feedback

- **Loading States**: Spinner during initial data fetch
- **Action States**: Buttons show "Reserving...", "Cancelling...", "Checking In..." during operations
- **Status Badges**: Color-coded badges for reservation status
  - Yellow: PENDING
  - Blue: CHECKED_IN
  - Green: ATTENDED
  - Red: NO_SHOW
- **Capacity Indicators**: Shows "X / Y spots filled" and available spots
- **Warning Banners**: 
  - Yellow: Maximum reservations reached
  - Orange: No sessions remaining on pass

### Date/Time Formatting

Uses `date-fns` for consistent formatting:
- Session dates: "EEE, MMM d, yyyy 'at' h:mm a" (e.g., "Mon, Jan 15, 2024 at 3:00 PM")
- Reservation timestamps: "MMM d, yyyy 'at' h:mm a"
- Check-in window: "MMM d 'at' h:mm a"

### Responsive Design

- Tailwind CSS classes for responsive layouts
- Mobile-friendly card layouts
- Button sizing appropriate for touch targets

## Navigation Flow

1. User visits **My Classes** (`/my-classes`)
2. Clicks **Manage Reservations** button on a registration
3. Navigates to **Reservations Page** (`/registrations/{id}/reservations`)
4. Views available sessions or manages existing reservations
5. Can return to My Classes via back button

## Error Handling

- Network errors: Display error message with retry option
- Authentication errors: Redirect to login
- Validation errors: Show alert with backend error message
- 404 errors: Show "Registration not found" message

## Future Enhancements

1. **Real-time Updates**: Auto-refresh when check-in window opens
2. **Calendar View**: Alternative view showing sessions in calendar format
3. **Filtering**: Filter sessions by date range or availability
4. **Waitlist**: Join waitlist for full sessions
5. **Multi-select**: Reserve multiple sessions at once
6. **Notifications**: Email/SMS reminders for check-in windows
7. **Pass Progress**: Visual progress bar for punch passes

## Testing Recommendations

1. Test with different pass types (UNLIMITED_SERIES, PUNCH_PASS, FULL_COURSE)
2. Verify reservation limits are enforced
3. Test check-in window timing (±2 hours)
4. Confirm punch deduction for punch passes
5. Test cancellation and re-reservation flow
6. Verify capacity limits prevent over-booking
7. Test on mobile devices for responsive layout
