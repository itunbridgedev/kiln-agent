# Fix: Missing Initial Reservation in "My Reservations" Page

## Problem
When a user registered for a class, they couldn't see the initial booking in the "My Reservations" page, even though it was created during registration.

## Root Cause
The application uses two different systems for tracking class attendance:

1. **RegistrationSession** - The original system that creates an initial booking when you register for a class
2. **SessionReservation** - The newer flexible reservation system used when you manually reserve additional sessions

The `/api/reservations/my-reservations` endpoint (used by the "My Reservations" page) was **only querying SessionReservation records**, completely ignoring the initial bookings stored in RegistrationSession.

Meanwhile, the "Manage Reservations" page (at `/api/registrations/:id/calendar`) correctly combined both types, which is why it worked there but not on "My Reservations".

## Solution
Updated the `/api/reservations/my-reservations` endpoint in `src/routes/reservations.ts` to:

1. Query **both** SessionReservation AND RegistrationSession tables
2. Combine them into a unified list
3. Sort by date and time
4. Return all upcoming reservations to the frontend

## Changes Made
- Modified `GET /api/reservations/my-reservations` endpoint
- Added query for `sessions` (RegistrationSession) relation in addition to existing `reservations` (SessionReservation) query
- Combined both types into a single sorted array before returning to the frontend

## Verification
Tested with Registration ID 18 which has:
- 1 initial booking (RegistrationSession) - created during class registration
- 3 flexible reservations (SessionReservation) - manually reserved later

**Before fix:** Only 3 reservations shown
**After fix:** All 4 reservations shown correctly

## Impact
✅ Users can now see their initial class booking in "My Reservations" page
✅ No changes needed to frontend code
✅ Consistent behavior between "My Reservations" and "Manage Reservations" pages
