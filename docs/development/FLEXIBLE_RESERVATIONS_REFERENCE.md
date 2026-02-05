# Flexible Class Reservations - Quick Reference

## Key Concepts

### 1. Pass Types
- **UNLIMITED_SERIES**: Attend any session within date range (e.g., Beginner Wheel Throwing Mon-Fri)
- **PUNCH_PASS**: Fixed number of sessions (e.g., 8-session pass)
- **FULL_COURSE**: Must attend all sessions in sequence (traditional class)

### 2. Reservation States
```
PENDING → CHECKED_IN → ATTENDED ✓
         ↓
      NO_SHOW → AUTO_CANCELLED (future reservations)
         ↓
   CANCELLED (customer initiated)
```

### 3. Check-In Rules
- **Customer**: 2 hours before to 2 hours after class start
- **Staff**: Anytime on class day (00:00-23:59)
- **Auto No-Show**: If not checked in by class end time

### 4. Reservation Limits
- Default: 3 sessions in advance
- Configurable per registration
- Counts only PENDING + CHECKED_IN reservations

### 5. No-Show Policy
```
No-Show Detected (day after class)
   ↓
Grace Period (24 hours default)
   ↓
Auto-Cancel Future Reservations
   ↓
Track No-Show Count
   ↓
Suspension if threshold exceeded (3 no-shows)
```

## Use Case Examples

### Example 1: Unlimited Series Pass
**Scenario**: Beginner Wheel Throwing, Mon-Fri 4-6pm, 8 weeks

```javascript
{
  passType: "UNLIMITED_SERIES",
  sessionsIncluded: null, // unlimited
  sessionsRemaining: null,
  maxAdvanceReservations: 3,
  validFrom: "2026-03-01",
  validUntil: "2026-04-26"
}
```

**Flow**:
1. Customer buys pass → Registration created
2. Customer reserves Mon 3/3, Wed 3/5, Fri 3/7 (3 reservations = limit reached)
3. Customer checks in Mon 3/3 → Attended
4. Customer can now book 1 more (currently at 2 pending)
5. No-show Wed 3/5 → Fri 3/7 auto-cancelled next day
6. Customer must book again to attend

### Example 2: 8-Punch Pass
**Scenario**: Open Studio time, 8 sessions

```javascript
{
  passType: "PUNCH_PASS",
  sessionsIncluded: 8,
  sessionsRemaining: 8,
  maxAdvanceReservations: 3,
  validFrom: "2026-03-01",
  validUntil: "2026-05-31" // 3 months
}
```

**Flow**:
1. Customer reserves 3 sessions (limit reached)
2. Customer checks in to session 1 → Punch deducted
3. Sessions remaining: 7, can book 1 more
4. Customer cancels session 2 (before class) → No punch deducted
5. Can reserve another session (still have 1 slot)
6. Customer no-shows session 3 → Punch still deducted
7. Future reservations auto-cancelled

### Example 3: Multi-Part Series
**Scenario**: Mug Building - 3 parts, each available multiple days

**Class Setup**:
```javascript
// Part 1
{
  stepNumber: 1,
  name: "Part 1 - Basic Shape",
  requiresSequence: true, // Must do Part 1 before Part 2
  allowMakeup: false
}

// Part 2  
{
  stepNumber: 2,
  name: "Part 2 - Handle & Refinement",
  requiresSequence: true, // Must do Part 2 before Part 3
  allowMakeup: false
}

// Part 3
{
  stepNumber: 3,
  name: "Part 3 - Glazing",
  requiresSequence: true,
  allowMakeup: false
}

// Makeup
{
  stepNumber: 4,
  name: "Makeup Session",
  requiresSequence: false, // Can do any part
  allowMakeup: true
}
```

**Registration**:
```javascript
{
  passType: "FULL_COURSE",
  requiresSequentialAttendance: true,
  maxAdvanceReservations: 3 // Can book all parts at once
}
```

**Flow**:
1. Customer reserves Part 1 (Tue), Part 2 (Thu), Part 3 (Tue)
2. System validates sequence → Allowed (will enforce attendance order)
3. Customer tries to check in to Part 2 first → Blocked (haven't attended Part 1)
4. Customer attends Part 1 → Can now attend Part 2
5. Customer no-shows Part 2 → Must rebook using makeup session

## Database Queries

### Check Reservation Limit
```sql
SELECT COUNT(*) 
FROM "SessionReservation"
WHERE "registrationId" = $1
  AND "reservationStatus" IN ('PENDING', 'CHECKED_IN');
-- Must be < maxAdvanceReservations
```

### Get Available Sessions
```sql
SELECT s.*, 
  s."maxStudents" - COUNT(r.id) as available_spots
FROM "ClassSession" s
LEFT JOIN "SessionReservation" r 
  ON s.id = r."sessionId" 
  AND r."reservationStatus" IN ('PENDING', 'CHECKED_IN', 'ATTENDED')
WHERE s."classId" = $1
  AND s."sessionDate" >= NOW()
  AND s."isCancelled" = false
GROUP BY s.id
HAVING COUNT(r.id) < s."maxStudents";
```

### Check Customer Suspension
```sql
SELECT * FROM "CustomerSuspension"
WHERE "customerId" = $1
  AND "studioId" = $2
  AND "isActive" = true
  AND "suspendedUntil" > NOW();
```

### Get Customer's Reservations
```sql
SELECT 
  sr.*,
  s."sessionDate",
  s."startTime",
  s."endTime",
  c."name" as class_name
FROM "SessionReservation" sr
JOIN "ClassSession" s ON sr."sessionId" = s.id
JOIN "Class" c ON s."classId" = c.id
WHERE sr."registrationId" = $1
ORDER BY s."sessionDate" DESC;
```

## API Examples

### Create Reservation
```typescript
POST /api/reservations
{
  registrationId: 123,
  sessionId: 456,
  customerNotes: "Looking forward to it!"
}

// Response
{
  id: 789,
  registrationId: 123,
  sessionId: 456,
  reservationStatus: "PENDING",
  reservedAt: "2026-03-01T10:00:00Z",
  session: {
    sessionDate: "2026-03-05",
    startTime: "16:00",
    endTime: "18:00"
  },
  checkInWindow: {
    start: "2026-03-05T14:00:00Z", // 2 hours before
    end: "2026-03-05T20:00:00Z"    // 2 hours after
  }
}
```

### Self Check-In
```typescript
POST /api/reservations/789/check-in
{
  method: "SELF"
}

// Response
{
  id: 789,
  reservationStatus: "CHECKED_IN",
  checkedInAt: "2026-03-05T15:45:00Z",
  checkedInMethod: "SELF",
  punchUsed: true, // If punch pass
  punchesRemaining: 7
}
```

### Get Calendar
```typescript
GET /api/registrations/123/calendar?month=2026-03

// Response
{
  registration: {
    passType: "UNLIMITED_SERIES",
    sessionsRemaining: null, // unlimited
    currentReservations: 2,
    maxReservations: 3,
    validUntil: "2026-04-26"
  },
  reservations: [
    {
      date: "2026-03-03",
      status: "ATTENDED",
      session: { startTime: "16:00", endTime: "18:00" }
    },
    {
      date: "2026-03-05",
      status: "NO_SHOW",
      session: { startTime: "16:00", endTime: "18:00" }
    },
    {
      date: "2026-03-10",
      status: "PENDING",
      canCheckIn: false, // too early
      session: { startTime: "16:00", endTime: "18:00" }
    }
  ]
}
```

## Cron Jobs Schedule

```
01:00 - No-Show Detection
02:00 - Auto-Cancellation  
03:00 - Suspension Enforcement
04:00 - Suspension Lifting
```

## Configuration Examples

### Studio-Wide No-Show Policy
```typescript
{
  studioId: 1,
  classId: null, // studio-wide
  gracePeriodHours: 24,
  maxNoShowsBeforeSuspension: 3,
  suspensionDurationDays: 7,
  deductPunchOnNoShow: true,
  allowSameDayRebooking: false,
  sendNoShowNotification: true,
  sendAutoCancelNotification: true
}
```

### Class-Specific Override
```typescript
{
  studioId: 1,
  classId: 42, // Beginner class - more lenient
  gracePeriodHours: 48, // 2 days
  maxNoShowsBeforeSuspension: 5,
  suspensionDurationDays: 3,
  deductPunchOnNoShow: false, // Don't deduct for beginners
  allowSameDayRebooking: true,
  sendNoShowNotification: true,
  sendAutoCancelNotification: true
}
```

## Testing Checklist

- [ ] Create reservation within limit
- [ ] Block reservation at limit
- [ ] Allow reservation after attendance
- [ ] Prevent duplicate reservation for same session
- [ ] Check-in within window
- [ ] Block check-in outside window
- [ ] Staff check-in anytime on class day
- [ ] Deduct punch on check-in (punch pass)
- [ ] Don't deduct on early cancellation
- [ ] Detect no-show after class end
- [ ] Auto-cancel future reservations
- [ ] Track no-show count
- [ ] Suspend at threshold
- [ ] Lift suspension after period
- [ ] Enforce sequence for multi-step
- [ ] Allow makeup without sequence
- [ ] Block new reservations when suspended
- [ ] Block new reservations when punches exhausted
- [ ] Validate pass expiration dates
- [ ] Handle concurrent reservation creation

---

**Quick Links**:
- [Full Design Doc](./FLEXIBLE_RESERVATIONS_DESIGN.md)
- [Implementation Status](./FLEXIBLE_RESERVATIONS_STATUS.md)
- [Schema Migration](../../prisma/migrations/add_flexible_reservations.sql)
