# Customer Booking Flow Design

## Current State Analysis

### What We Have Built

#### 1. **Schedule Pattern System** (Admin-Facing)

- `ClassSchedulePattern` - RRULE-based recurring patterns
- Admins create patterns like "FREQ=WEEKLY;BYDAY=MO;COUNT=6"
- Patterns define when classes happen but **don't create actual sessions yet**

#### 2. **Session Management** (Currently Manual)

- `ClassSession` - Individual class occurrences
- Currently created manually via seed script
- Has fields for instructor/assistant assignments via:
  - `ClassSessionInstructor` junction table
  - `ClassSessionAssistant` junction table

#### 3. **Staff Management**

- `TeachingRole` - Roles like "Glazing Specialist", "Wheel Instructor"
- `StaffTeachingRole` - Links staff (customers with staff role) to teaching roles
- Staff members are just `Customer` records with `roles` including "staff"

#### 4. **Registration System** (Partially Built)

- `ClassRegistration` - Main booking record
- `RegistrationSession` - Links registration to specific sessions
- `SessionResourceAllocation` - Tracks resource usage per registration
- Supports three types:
  - `SINGLE_SESSION` - Book one specific session
  - `FULL_SCHEDULE` - Book entire multi-week course
  - `DROP_IN` - Drop into a series class

---

## The Missing Links

### 1. **Session Generation from Patterns** ❌

**Problem:** Schedule patterns exist but don't automatically create `ClassSession` records.

**What's Needed:**

```typescript
// Service to generate sessions from pattern
async function generateSessionsFromPattern(patternId: number) {
  const pattern = await prisma.classSchedulePattern.findUnique({
    where: { id: patternId },
    include: { class: true },
  });

  // Parse RRULE and generate dates
  const dates = parseRRule(
    pattern.recurrenceRule,
    pattern.startDate,
    pattern.endDate
  );

  // Create ClassSession for each date
  for (const date of dates) {
    await prisma.classSession.create({
      data: {
        studioId: pattern.studioId,
        schedulePatternId: pattern.id,
        classId: pattern.classId,
        classStepId: pattern.classStepId,
        sessionDate: date,
        startTime: pattern.startTime,
        endTime: calculateEndTime(pattern.startTime, pattern.durationHours),
        maxStudents: pattern.maxStudents,
        location: pattern.location,
        // NO instructor assignment yet - that's manual
      },
    });
  }
}
```

**When to Generate:**

- After admin creates a pattern via SchedulePatternManager
- Optionally: Regenerate if pattern is edited (delete old sessions, create new)
- Show preview before finalizing

---

### 2. **Staff Assignment to Sessions** ❌

**Problem:** No UI or workflow for admins to assign teachers to sessions.

**Current Approach (Your Question):**
The seed script just created sessions without any instructor assignments. The schema supports it via `ClassSessionInstructor` and `ClassSessionAssistant`, but there's no UI for it.

**What's Needed:**

#### Option A: **Assign at Pattern Level** (Simpler)

Add instructor assignment when creating the pattern:

```typescript
// In ClassSchedulePattern
instructorId: Int?  // Default instructor for all sessions
assistantIds: Int[] // Default assistants
```

Then when generating sessions, auto-populate:

```typescript
await prisma.classSessionInstructor.create({
  data: {
    sessionId: session.id,
    customerId: pattern.instructorId,
    roleId: class.teachingRoleId
  }
});
```

#### Option B: **Assign Per Session** (More Flexible)

In Studio Calendar view:

- Click on a session
- See "Assigned Staff" section
- Add/remove instructors and assistants
- Filter staff by their `StaffTeachingRole` (only show qualified staff)

```tsx
// SessionStaffAssignment Component
<div className="session-staff">
  <h4>Instructor</h4>
  <select value={instructorId} onChange={handleInstructorChange}>
    {qualifiedStaff.map((staff) => (
      <option key={staff.id} value={staff.id}>
        {staff.name} - {staff.roles.join(", ")}
      </option>
    ))}
  </select>

  <h4>Assistants</h4>
  <MultiSelect
    options={qualifiedStaff}
    value={assistantIds}
    onChange={handleAssistantsChange}
  />
</div>
```

**Recommendation:** Start with Option A (pattern-level), add Option B later for flexibility.

---

### 3. **Customer Booking Flow** ❌ (Your Main Concern)

**Problem:** No way for customers to actually book classes yet.

**What's Needed:**

#### Phase 1: Browse Available Classes

Public-facing class catalog:

```
/classes
  └── ClassCard for each active class
      └── Shows: name, description, price, upcoming sessions
```

#### Phase 2: View Class Details & Sessions

```
/classes/[id]
  └── Class details (description, teacher info, requirements)
  └── "Available Sessions" or "Upcoming Start Dates"
  └── Resource requirements (e.g., "Requires 1 potter's wheel per student")
  └── Price breakdown
```

#### Phase 3: Select Sessions

Depends on class type:

**Single Session:**

```tsx
<div className="session-picker">
  {sessions.map((session) => (
    <SessionCard
      date={session.sessionDate}
      time={`${session.startTime} - ${session.endTime}`}
      spotsLeft={session.maxStudents - session.currentEnrollment}
      onBook={() => handleBook(session.id)}
    />
  ))}
</div>
```

**Multi-Session (6-week course):**

```tsx
<div className="schedule-picker">
  <p>This course meets Mondays from 6-8pm for 6 weeks</p>
  <select value={scheduleId} onChange={setScheduleId}>
    {schedules.map((schedule) => (
      <option key={schedule.id} value={schedule.id}>
        Starts {format(schedule.startDate, "MMM d, yyyy")}(
        {schedule.enrolledCount}/{schedule.maxStudents} enrolled)
      </option>
    ))}
  </select>
</div>
```

**Series (Drop-in anytime):**

```tsx
<div className="series-picker">
  <p>Pick which sessions you want to attend:</p>
  {sessions.map((session) => (
    <Checkbox
      key={session.id}
      label={`${format(session.sessionDate, "MMM d")} at ${session.startTime}`}
      checked={selectedSessions.includes(session.id)}
      onChange={() => toggleSession(session.id)}
    />
  ))}
  <p>Total: ${selectedSessions.length * pricePerSession}</p>
</div>
```

#### Phase 4: Guest Count & Resource Check

```tsx
<div className="guest-count">
  <label>Number of people attending:</label>
  <input
    type="number"
    min={1}
    max={remainingSpots}
    value={guestCount}
    onChange={(e) => setGuestCount(e.target.value)}
  />

  {/* Resource availability check */}
  {resourceRequirements.map((req) => {
    const needed = guestCount * req.quantityPerStudent;
    const available = req.resource.quantityAvailable;
    return (
      <div key={req.resourceId}>
        {needed <= available ? (
          <span className="text-success">
            ✓ {req.resource.name}: {needed} needed, {available} available
          </span>
        ) : (
          <span className="text-error">
            ✗ Not enough {req.resource.name} ({needed} needed, only {available}{" "}
            available)
          </span>
        )}
      </div>
    );
  })}
</div>
```

#### Phase 5: Registration (Skip Payment for Now)

```tsx
async function handleCompleteRegistration() {
  // Create registration record
  const registration = await fetch("/api/registrations", {
    method: "POST",
    body: JSON.stringify({
      classId: classData.id,
      scheduleId: selectedScheduleId, // or null for DROP_IN
      registrationType: "FULL_SCHEDULE", // or SINGLE_SESSION or DROP_IN
      guestCount: guestCount,
      sessionIds: selectedSessions, // for SINGLE_SESSION/DROP_IN
      customerNotes: notes,
      // Skip payment fields for now
      amountPaid: totalPrice,
      paymentStatus: "PENDING", // or auto-confirm: 'COMPLETED'
    }),
  });

  // If successful, redirect to confirmation page
  router.push(`/registrations/${registration.id}/confirmation`);
}
```

---

## Recommended Implementation Order

### Phase 1: Session Generation (Backend)

1. Create `/api/admin/schedule-patterns/:id/generate-sessions` endpoint
2. Parse RRULE and create `ClassSession` records
3. Add "Generate Sessions" button to SchedulePatternManager component
4. Show session preview before confirming

### Phase 2: Staff Assignment (Admin UI)

1. Add instructor/assistant fields to pattern creation form
2. Auto-assign staff when sessions are generated
3. (Optional) Add per-session staff editor in Studio Calendar

### Phase 3: Customer Class Browser (Public)

1. Create `/classes` page with class cards
2. Create `/classes/[id]` detail page
3. Show upcoming sessions/schedules based on generated `ClassSession` records

### Phase 4: Booking Flow (Customer-Facing)

1. Add session/schedule selector to class detail page
2. Add guest count input with resource availability validation
3. Create `/api/registrations` POST endpoint
4. Create `ClassRegistration` and `RegistrationSession` records
5. Create `SessionResourceAllocation` records
6. Update `currentEnrollment` counters
7. Send confirmation email (optional)

### Phase 5: Booking Management

1. Customer dashboard to view registrations
2. Cancellation workflow (update status, free up resources)
3. Waitlist notification system

---

## Key Questions to Answer

### 1. When are sessions generated?

**Recommendation:** Admin explicitly clicks "Generate Sessions" after creating pattern. This gives them control and shows a preview.

### 2. How are teachers assigned?

**Recommendation:**

- **Now:** Admin assigns instructor/assistants at pattern level
- **Later:** Override per-session in Studio Calendar

### 3. Who can book what?

- Customers with `customer` role can book classes
- Staff can book on behalf of customers (admin UI)
- Anonymous users? Require account creation first

### 4. How to handle payment?

- **Now:** Skip it - set `paymentStatus: 'COMPLETED'` automatically
- **Later:** Integrate Stripe
  - Create PaymentIntent on booking
  - Store `paymentIntentId` in `ClassRegistration`
  - Only confirm registration after payment succeeds

### 5. Resource allocation timing?

**Critical:** Resources are allocated when:

1. `ClassRegistration` is created with `CONFIRMED` status
2. `SessionResourceAllocation` records created linking:
   - `registrationId`
   - `sessionId`
   - `resourceId`
   - `quantityAllocated = guestCount * quantityPerStudent`
3. Resource `quantityAvailable` is **NOT** decremented (it's calculated dynamically)

**To check availability:**

```sql
-- For a specific session and resource
SELECT
  r.quantityTotal,
  COALESCE(SUM(sra.quantityAllocated), 0) as allocated,
  r.quantityTotal - COALESCE(SUM(sra.quantityAllocated), 0) as available
FROM StudioResource r
LEFT JOIN SessionResourceAllocation sra
  ON sra.resourceId = r.id
  AND sra.sessionId = ?
WHERE r.id = ?
GROUP BY r.id
```

---

## Next Steps

Would you like me to:

1. **Implement Session Generation** - Create the endpoint and button to generate sessions from patterns?

2. **Build Customer Class Browser** - Create `/classes` and `/classes/[id]` pages so customers can see what's available?

3. **Implement Booking Flow** - Build the full registration process (guest count, resource check, create registration)?

4. **Add Staff Assignment UI** - Let admins assign teachers to sessions?

I'd recommend starting with **#1 (Session Generation)** since everything else depends on having actual sessions to book. Then **#2 (Class Browser)** to let customers see what's available, followed by **#3 (Booking Flow)**.
