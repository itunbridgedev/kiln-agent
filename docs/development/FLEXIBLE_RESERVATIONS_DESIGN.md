# Flexible Class Reservations Design

## Overview
Enhanced class registration system supporting:
- Punch passes (e.g., "8-session pass")
- Flexible session reservations (book up to N sessions in advance)
- Automatic cancellation on absence
- Self and staff check-in capabilities
- Multi-part series with flexible day selection

## Use Cases

### 1. Series Classes (e.g., Beginner Wheel Throwing)
- Course available Mon-Fri, 4:00pm-6:00pm
- Students can attend any session after purchasing
- Limit: Book max 3 sessions in advance
- Auto-cancel future reservations if absent for reserved session

### 2. Multi-Part Series (e.g., Mug Building Course)
- Part 1: Week 1 (choose any day)
- Part 2: Week 2 (choose any day)
- Part 3: Week 3 (choose any day)
- Part 1/2/3 Makeup: Week 4 (choose any day, any part)
- Students choose day of week for each part

### 3. Punch Passes
- Customer buys "8-punch pass"
- Can reserve up to 3 sessions in advance
- System tracks remaining punches
- Punches deducted on attendance

## Data Model Changes

### New Enums
```prisma
enum PassType {
  UNLIMITED_SERIES    // Attend any session in date range
  PUNCH_PASS          // Limited number of sessions
  FULL_COURSE         // All sessions required
}

enum ReservationStatus {
  PENDING             // Reserved but not attended
  CHECKED_IN          // Customer checked in
  ATTENDED            // Confirmed attendance
  NO_SHOW             // Didn't show for reservation
  CANCELLED           // Cancelled by customer
  AUTO_CANCELLED      // System cancelled due to absence
}
```

### ClassRegistration Enhancements
- Add `passType` field
- Add `sessionsIncluded` (null for unlimited, number for punch passes)
- Add `sessionsRemaining` (tracks remaining punches)
- Add `maxAdvanceReservations` (default 3)
- Add `requiresSequentialAttendance` (for multi-step series)
- Add `absenceGracePeriod` (hours after no-show before auto-cancel)

### New: SessionReservation Table
Separate reservations from actual attendance:
- `reservationId` (PK)
- `registrationId` (FK to ClassRegistration)
- `sessionId` (FK to ClassSession)
- `reservationStatus`
- `reservedAt`
- `checkedInAt`
- `checkedInBy` (customer or staff)
- `noShowDetectedAt`
- `autoCancelledAt`

### Check-in Rules
- **Customer self check-in**: 2 hours before to 2 hours after class start
- **Staff check-in**: Anytime on class day (00:00 - 23:59)
- **Automatic no-show**: If not checked in by end of class

## Business Logic

### Reservation Limits
1. Check current reservation count for registration
2. Count only PENDING + CHECKED_IN reservations
3. Block new reservations if at limit
4. Allow cancellation to free up slot

### Absence Detection & Auto-Cancel
1. Cron job runs daily at 1:00 AM
2. Find reservations with status=NO_SHOW from previous day
3. For each no-show:
   - Mark all future PENDING reservations as AUTO_CANCELLED
   - Send notification to customer
   - Log reason in admin notes

### Punch Pass Management
1. On reservation: Check sessionsRemaining > 0
2. On check-in: Decrement sessionsRemaining
3. On cancellation before class: No deduction
4. On no-show: Still deduct (configurable per studio)

### Multi-Part Series
1. ClassStep now has `requiredSequence` boolean
2. If true, must complete parts in order
3. System checks previous part attendance before allowing next reservation

## API Endpoints

### Customer Endpoints
```
POST   /api/reservations                    # Create reservation
GET    /api/reservations/available          # Get available sessions
DELETE /api/reservations/:id                # Cancel reservation
POST   /api/reservations/:id/check-in       # Self check-in
GET    /api/registrations/:id/calendar      # Get customer's calendar
GET    /api/registrations/:id/status        # Get pass status & remaining sessions
```

### Staff Endpoints
```
POST   /api/staff/reservations/:id/check-in       # Staff check-in
GET    /api/staff/sessions/:id/reservations       # Get session reservations
POST   /api/staff/sessions/:id/attendance         # Bulk check-in
GET    /api/staff/sessions/:id/no-shows           # Get no-shows for session
```

### Admin Endpoints
```
GET    /api/admin/reservations/no-shows           # Monitor no-shows
POST   /api/admin/reservations/:id/override       # Override auto-cancellation
GET    /api/admin/reports/utilization             # Reservation analytics
```

## Migration Strategy

### Phase 1: Schema Updates
- Add new enums
- Add fields to ClassRegistration
- Create SessionReservation table
- Migrate existing RegistrationSession to SessionReservation

### Phase 2: Core Reservation Logic
- Implement reservation creation with limits
- Add check-in endpoints (customer & staff)
- Build availability calculation

### Phase 3: Automation
- Build no-show detection job
- Implement auto-cancellation logic
- Add notification system

### Phase 4: UI Components
- Reservation calendar view
- Check-in interface
- Pass status dashboard

## Technical Considerations

### Performance
- Index SessionReservation(registrationId, status)
- Index SessionReservation(sessionId, status)
- Cache available session counts

### Concurrency
- Use database transactions for reservation creation
- Implement optimistic locking for session capacity
- Handle race conditions in availability checks

### Notifications
- Email on reservation confirmation
- Email/SMS on auto-cancellation
- Reminder 24h before reserved session

## Testing Strategy
1. Unit tests for reservation limit logic
2. Integration tests for check-in workflows
3. End-to-end tests for auto-cancellation
4. Load tests for concurrent reservations
