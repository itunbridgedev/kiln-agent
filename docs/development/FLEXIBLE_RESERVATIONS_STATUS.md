# Flexible Class Reservations - Implementation Progress

## ✅ Phase 1: Schema Foundation (COMPLETED)

### Database Schema Changes
1. **New Enums Created:**
   - `PassType`: UNLIMITED_SERIES, PUNCH_PASS, FULL_COURSE
   - `ReservationStatus`: PENDING, CHECKED_IN, ATTENDED, NO_SHOW, CANCELLED, AUTO_CANCELLED

2. **ClassRegistration Enhanced:**
   - `passType`: Type of pass purchased
   - `sessionsIncluded`: Number of sessions in punch pass (null = unlimited)
   - `sessionsRemaining`: Remaining sessions available
   - `sessionsAttended`: Total sessions attended counter
   - `maxAdvanceReservations`: Max sessions bookable in advance (default: 3)
   - `requiresSequentialAttendance`: Enforce ordered completion for multi-step
   - `absenceGracePeriodHours`: Hours before auto-canceling futures (default: 24)
   - `validFrom`/`validUntil`: Pass validity date range

3. **New Tables Created:**
   - **SessionReservation**: Granular reservation tracking separate from attendance
     * Lifecycle tracking: reserved → checked-in → attended/no-show
     * Check-in method tracking (SELF, STAFF, AUTO)
     * Punch usage tracking
     * Cancellation audit trail
   
   - **ReservationHistory**: Complete audit log of all reservation changes
     * Action tracking (CREATED, CHECKED_IN, CANCELLED, NO_SHOW, AUTO_CANCELLED)
     * Performer tracking (customer/staff/system)
     * Status transitions
     * Metadata for additional context
   
   - **NoShowPolicy**: Configurable policies per studio or class
     * Grace period before auto-cancellation
     * Max no-shows before suspension
     * Suspension duration
     * Punch deduction rules
     * Notification settings
   
   - **CustomerSuspension**: Track suspended customers
     * No-show counter
     * Suspension period tracking
     * Lift capability for staff
     * Active/inactive status

4. **ClassStep Enhanced:**
   - `requiresSequence`: Must complete previous steps first
   - `allowMakeup`: Can be used for makeup sessions

5. **Comprehensive Indexing:**
   - Performance indexes on all foreign keys
   - Composite indexes for common queries (registrationId + status, sessionId + status)
   - Date-based indexes for time-range queries

## 📋 Next Steps

### Phase 2: Core API Implementation
**Priority: HIGH**

#### Reservation Management APIs
```
POST   /api/reservations
  - Create new reservation
  - Check availability
  - Validate advance reservation limit
  - Verify pass validity & remaining sessions
  - Check customer suspension status

GET    /api/reservations/available
  - List available sessions for a class/pass
  - Filter by date range
  - Show capacity per session
  - Respect class step sequence requirements

DELETE /api/reservations/:id
  - Cancel reservation
  - Free up capacity
  - Log cancellation in history

GET    /api/registrations/:id/reservations
  - List all reservations for a registration
  - Show past, current, and future
  - Include attendance status
```

#### Check-In APIs
```
POST   /api/reservations/:id/check-in
  - Customer self check-in (2 hours before/after class)
  - Validate time window
  - Deduct punch if applicable
  - Log check-in action

POST   /api/staff/reservations/:id/check-in
  - Staff check-in (anytime on class day)
  - Support bulk check-in
  - Override time restrictions

GET    /api/sessions/:id/check-in-status
  - Get check-in window times
  - Check if customer can self-check-in
```

#### Calendar & Status APIs
```
GET    /api/registrations/:id/calendar
  - Customer's reservation calendar view
  - Past attended sessions
  - Future pending reservations
  - No-show history

GET    /api/registrations/:id/status
  - Pass status summary
  - Sessions remaining
  - Reservations count (X of 3)
  - Validity period
  - Suspension status
```

### Phase 3: Automated Jobs
**Priority: HIGH**

#### No-Show Detection Job
- **Schedule**: Runs daily at 1:00 AM
- **Logic**:
  1. Find reservations from previous day with status = PENDING
  2. Check if session end time has passed
  3. Mark as NO_SHOW if not checked in
  4. Apply no-show policy:
     - Deduct punch if configured
     - Increment no-show counter
     - Check suspension threshold
  5. Log all actions to ReservationHistory

#### Auto-Cancellation Job
- **Schedule**: Runs daily at 2:00 AM (after no-show detection)
- **Logic**:
  1. Find NO_SHOW reservations within grace period
  2. Get all future PENDING reservations for same registration
  3. Mark all as AUTO_CANCELLED
  4. Send notification email
  5. Log cancellations with reason

#### Suspension Enforcement Job
- **Schedule**: Runs daily at 3:00 AM
- **Logic**:
  1. Check customers who hit no-show limit
  2. Create CustomerSuspension record
  3. Calculate suspension end date
  4. Send suspension notification
  5. Block new reservations during suspension

#### Suspension Lift Job
- **Schedule**: Runs daily at 4:00 AM
- **Logic**:
  1. Find active suspensions past end date
  2. Mark as inactive (liftedAt = now)
  3. Send reinstatement email

### Phase 4: Business Logic Services
**Priority: MEDIUM**

#### ReservationService
```typescript
class ReservationService {
  // Validate reservation request
  async canCreateReservation(registrationId, sessionId)
  
  // Create reservation with all validations
  async createReservation(data)
  
  // Check advance reservation limit
  async checkReservationLimit(registrationId)
  
  // Validate session availability
  async checkSessionAvailability(sessionId)
  
  // Check customer suspension
  async isCustomerSuspended(customerId, studioId)
  
  // Check pass validity & remaining sessions
  async validatePassStatus(registrationId)
}
```

#### CheckInService
```typescript
class CheckInService {
  // Validate check-in window
  async canCheckIn(reservationId, customerId, role)
  
  // Perform check-in
  async checkIn(reservationId, checkedInBy, method)
  
  // Bulk check-in for staff
  async bulkCheckIn(sessionId, customerIds, staffId)
  
  // Calculate check-in window
  getCheckInWindow(session, role)
}
```

#### PunchPassService
```typescript
class PunchPassService {
  // Check remaining punches
  async getRemainingPunches(registrationId)
  
  // Deduct punch on check-in
  async deductPunch(registrationId, reservationId)
  
  // Refund punch on early cancellation
  async refundPunch(registrationId, reservationId)
}
```

### Phase 5: UI Components
**Priority: MEDIUM**

#### Customer Views
1. **Reservation Calendar**
   - Month view with available sessions
   - Past sessions (attended/no-show)
   - Future reservations (pending/checked-in)
   - Reservation limit indicator (2 of 3 used)

2. **Pass Status Dashboard**
   - Sessions remaining counter
   - Reservations used/available
   - Validity period
   - Suspension notice (if applicable)

3. **Available Sessions List**
   - Filter by date range
   - Show capacity per session
   - Quick reserve button
   - Step sequence validation

4. **Check-In Interface**
   - Show check-in window
   - QR code option
   - Confirmation screen

#### Staff Views
1. **Session Roster**
   - List all reservations for session
   - Check-in status indicators
   - Bulk check-in controls
   - No-show marking

2. **No-Show Management**
   - View no-shows by date
   - Customer no-show history
   - Override auto-cancellation
   - Manual suspension controls

3. **Suspension Dashboard**
   - Active suspensions list
   - Lift suspension interface
   - Suspension history
   - Policy configuration

### Phase 6: Notifications
**Priority: MEDIUM**

#### Email Notifications
- Reservation confirmation
- Reminder 24h before session
- Check-in confirmation
- No-show notification
- Auto-cancellation notice
- Suspension notice
- Reinstatement confirmation

#### SMS Notifications (Optional)
- 2-hour check-in reminder
- Last-call notifications

### Phase 7: Testing
**Priority: HIGH**

#### Unit Tests
- Reservation validation logic
- Check-in time window calculations
- Punch deduction logic
- Suspension threshold checks
- Sequence requirement validation

#### Integration Tests
- End-to-end reservation flow
- Check-in workflows (customer + staff)
- Auto-cancellation process
- Suspension enforcement
- Concurrent reservation handling

#### Load Tests
- Concurrent reservation creation
- Race condition handling for capacity
- Database transaction performance

## 🎯 Success Criteria

### For Unlimited Series (e.g., Beginner Wheel Throwing)
- ✅ Customer can reserve up to 3 sessions in advance
- ✅ Customer can attend any session within validity period
- ✅ System auto-cancels future reservations after no-show
- ✅ Customer and staff can check in appropriately
- ✅ No punch tracking (unlimited attendance)

### For Punch Passes (e.g., 8-Session Pass)
- ✅ Customer can reserve up to 3 sessions in advance
- ✅ System tracks remaining punches
- ✅ Punch deducted only on check-in
- ✅ Punch refunded on early cancellation
- ✅ No new reservations when punches exhausted

### For Multi-Part Series (e.g., Mug Building)
- ✅ Customer chooses day for each part
- ✅ System enforces sequence (complete Part 1 before Part 2)
- ✅ Makeup sessions available without sequence requirement
- ✅ One reservation per part enforced

## 🚀 Deployment Strategy

1. **Database Migration**
   - Run migration in staging
   - Test all constraints
   - Backup production
   - Run migration in production during off-peak

2. **Feature Flag Rollout**
   - Enable for internal testing studio first
   - Monitor for 1 week
   - Gradually enable for other studios
   - Collect feedback

3. **Data Migration**
   - Migrate existing RegistrationSession to SessionReservation
   - Set default PassType based on class type
   - Create default NoShowPolicy for each studio
   - Validate data consistency

4. **Monitoring**
   - Track reservation creation rate
   - Monitor no-show detection job
   - Alert on suspension spike
   - Dashboard for policy effectiveness

## 📊 Metrics to Track

1. **Reservation Behavior**
   - Average advance booking time
   - Cancellation rate
   - No-show rate per class type
   - Check-in method distribution (self vs staff)

2. **Pass Utilization**
   - Average sessions used per punch pass
   - Expiration rate
   - Most popular session times

3. **Policy Effectiveness**
   - Suspension rate
   - No-show reduction after policy
   - Auto-cancellation frequency
   - Customer retention after suspension

## 📝 Documentation Needed

1. **User Guides**
   - How to make reservations
   - Check-in procedures
   - Understanding pass types
   - What happens on no-show

2. **Staff Training**
   - Check-in procedures
   - No-show management
   - Suspension handling
   - Policy configuration

3. **API Documentation**
   - Reservation endpoints
   - Check-in flows
   - Webhook events
   - Error codes

## Current Status

- ✅ Phase 1: Schema Foundation - COMPLETE
- ⏳ Phase 2: Core API Implementation - NEXT
- ⏳ Phase 3: Automated Jobs - NEXT
- ⏳ Phase 4: Business Logic Services - PENDING
- ⏳ Phase 5: UI Components - PENDING
- ⏳ Phase 6: Notifications - PENDING
- ⏳ Phase 7: Testing - PENDING

**Last Updated**: February 5, 2026
**Branch**: `feature/flexible-class-reservations`
**Commits**: 1 (schema foundation)
