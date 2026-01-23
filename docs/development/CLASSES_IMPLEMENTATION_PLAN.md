# Classes Module - Detailed Implementation Plan

## Overview

This document breaks down the advanced Classes module features into 8 sequential phases, each designed to be completed in 1-4 weeks. Each phase builds on the previous, allowing for incremental testing and deployment.

---

## Development Phases Summary

| Phase | Name                               | Duration  | Dependencies      |
| ----- | ---------------------------------- | --------- | ----------------- |
| 3A    | Teaching Roles & Staff Management  | 1-2 weeks | Basic Classes (✓) |
| 3B    | Class Schedule Patterns            | 2-3 weeks | Phase 3A          |
| 3C    | Staff Scheduling & Availability    | 2-3 weeks | Phase 3A, 3B      |
| 3D    | Customer Registration & Enrollment | 3-4 weeks | Phase 3B          |
| 3E    | Attendance & Check-in              | 2 weeks   | Phase 3D          |
| 3F    | Notifications & Reminders          | 1-2 weeks | Phase 3D          |
| 3G    | Studio Hours & Holiday Management  | 1-2 weeks | Phase 3B          |
| 3H    | Materials & Inventory              | 2-3 weeks | Phase 3E          |

**Total Estimated Duration:** 14-21 weeks (3.5-5 months)

---

## Phase 3A: Teaching Roles & Staff Management (1-2 weeks)

### User Stories

**As an Admin:**

- I want to define teaching roles (Basic Teacher, Intermediate Teacher, etc.)
- I want to assign multiple roles to staff members
- I want to link classes to roles instead of specific teachers
- I want to see which staff members are qualified for each role

**As a Staff Member:**

- I want to see which teaching roles I'm assigned
- I want to view classes that match my teaching roles

### Technical Tasks

#### Database

- [ ] Create `TeachingRole` model
- [ ] Create `StaffTeachingRole` junction table
- [ ] Add `teachingRoleId` to `Class` model
- [ ] Generate and apply migration

#### Backend API

- [ ] `GET /api/admin/teaching-roles` - List all roles
- [ ] `POST /api/admin/teaching-roles` - Create role
- [ ] `PUT /api/admin/teaching-roles/:id` - Update role
- [ ] `DELETE /api/admin/teaching-roles/:id` - Delete role
- [ ] `GET /api/admin/staff` - List staff with roles
- [ ] `POST /api/admin/staff/:userId/roles` - Assign role to staff
- [ ] `DELETE /api/admin/staff/:userId/roles/:roleId` - Remove role

#### Frontend Components

- [ ] `TeachingRoleForm.tsx` - Create/edit teaching roles
- [ ] `TeachingRoleTable.tsx` - List all roles
- [ ] `StaffManagement.tsx` - Manage staff and role assignments
- [ ] `StaffRoleAssignment.tsx` - Assign roles to staff member
- [ ] Update `ClassForm.tsx` - Replace instructor text with role selector

#### Testing

- [ ] Create sample teaching roles
- [ ] Assign roles to test users
- [ ] Create class linked to role
- [ ] Verify role-based filtering

### Deliverables

- Admin can create and manage teaching roles
- Admin can assign multiple roles to staff
- Classes link to roles (not specific teachers)
- Staff view shows assigned roles

---

## Phase 3B: Class Schedule Patterns (2-3 weeks)

### User Stories

**As an Admin:**

- I want to create recurring class schedules (every Tuesday at 6 PM for 8 weeks)
- I want to preview all sessions before creating them
- I want to create one-off classes that don't repeat
- I want to bulk generate sessions from a pattern
- I want to edit the pattern and regenerate future sessions

**As a Customer:**

- I want to see all scheduled dates when browsing a class

### Technical Tasks

#### Database

- [ ] Create `ClassSchedulePattern` model with RRULE support
- [ ] Update `ClassSession` to reference pattern (nullable)
- [ ] Add `isCancelled` flag to `ClassSession`
- [ ] Generate and apply migration

#### Backend API

- [ ] `POST /api/admin/classes/:id/schedule-pattern` - Create pattern
- [ ] `GET /api/admin/classes/:id/schedule-pattern` - Get pattern
- [ ] `PUT /api/admin/schedule-patterns/:id` - Update pattern
- [ ] `DELETE /api/admin/schedule-patterns/:id` - Delete pattern
- [ ] `POST /api/admin/schedule-patterns/:id/generate-sessions` - Bulk create
- [ ] `GET /api/admin/schedule-patterns/:id/preview` - Preview sessions
- [ ] `POST /api/admin/classes/:classId/sessions` - Create one-off session
- [ ] `PUT /api/admin/sessions/:id` - Update individual session
- [ ] `DELETE /api/admin/sessions/:id` - Cancel session

#### Frontend Components

- [ ] `SchedulePatternForm.tsx` - Create recurring pattern
- [ ] `SchedulePreview.tsx` - Preview generated sessions
- [ ] `SessionCalendar.tsx` - Calendar view of sessions
- [ ] `OneOffSessionForm.tsx` - Create single session
- [ ] `SessionEditor.tsx` - Edit individual session

#### Third-Party Libraries

- [ ] Install `rrule` npm package for recurring rule parsing
- [ ] Integrate calendar library (FullCalendar or React Big Calendar)

#### Testing

- [ ] Create weekly recurring pattern for 8 weeks
- [ ] Preview and generate sessions
- [ ] Create one-off session
- [ ] Edit single session from pattern
- [ ] Cancel session and verify it doesn't show in catalog

### Deliverables

- Admins can define recurring schedule patterns
- System generates sessions automatically from patterns
- Admins can create one-off sessions
- Calendar view shows all upcoming sessions
- Individual sessions can be edited/cancelled

---

## Phase 3C: Staff Scheduling & Availability (2-3 weeks)

### User Stories

**As a Manager:**

- I want to set up recurring schedules for staff (John works Mon/Wed 9-5)
- I want to mark when staff are unavailable (vacation, sick days)
- I want to assign staff to specific class sessions
- I want to see conflicts before assigning staff
- I want maxStudents to auto-adjust based on how many staff are assigned

**As a Staff Member:**

- I want to view my upcoming teaching schedule
- I want to see which classes I'm assigned to

### Technical Tasks

#### Database

- [ ] Create `StaffSchedulePattern` model
- [ ] Create `StaffScheduleException` model
- [ ] Create `SessionStaffAssignment` model
- [ ] Add `assignedStaffCount` to `ClassSession`
- [ ] Generate and apply migration

#### Backend API

- [ ] `GET /api/admin/staff/:userId/schedule` - Get staff schedule
- [ ] `POST /api/admin/staff/:userId/schedule` - Create schedule pattern
- [ ] `PUT /api/admin/staff/:userId/schedule/:id` - Update pattern
- [ ] `DELETE /api/admin/staff/:userId/schedule/:id` - Delete pattern
- [ ] `POST /api/admin/staff/:userId/exceptions` - Add time off
- [ ] `DELETE /api/admin/staff/:userId/exceptions/:id` - Remove exception
- [ ] `POST /api/admin/sessions/:sessionId/assign-staff` - Assign staff to session
- [ ] `DELETE /api/admin/sessions/:sessionId/staff/:userId` - Unassign staff
- [ ] `GET /api/admin/sessions/:sessionId/available-staff` - Get available staff
- [ ] `GET /api/staff/my-schedule` - Staff calendar view

#### Backend Logic

- [ ] Implement conflict detection algorithm
- [ ] Auto-adjust `maxStudents` based on staff count formula
- [ ] Calculate staff availability for given date/time
- [ ] Validate assignments against staff schedule and role

#### Frontend Components

- [ ] `StaffScheduleManager.tsx` - Manager interface for staff scheduling
- [ ] `StaffSchedulePattern.tsx` - Define recurring schedule
- [ ] `StaffExceptions.tsx` - Mark unavailable times
- [ ] `SessionStaffAssignment.tsx` - Assign staff to session
- [ ] `StaffCalendar.tsx` - Staff member's teaching calendar
- [ ] `AvailableStaffList.tsx` - Show available staff for session

#### Business Rules

```javascript
// Example: maxStudents calculation
const baseCapacity = 8; // per teacher
const assistantBonus = 4; // per assistant
maxStudents = teacherCount * baseCapacity + assistantCount * assistantBonus;
```

#### Testing

- [ ] Create recurring schedule for staff member
- [ ] Add vacation exception
- [ ] Assign staff to session (verify no conflicts)
- [ ] Attempt to assign unavailable staff (verify rejection)
- [ ] Verify maxStudents updates when staff assigned
- [ ] Staff member views their calendar

### Deliverables

- Managers can create recurring staff schedules
- Managers can mark staff unavailable
- System prevents double-booking staff
- maxStudents dynamically adjusts based on assigned staff
- Staff can view their teaching calendar

---

## Phase 3D: Customer Registration & Enrollment (3-4 weeks)

### User Stories

**As a Customer:**

- I want to browse available classes with dates and times
- I want to register for a single session
- I want to register for an entire course (all sessions)
- I want to receive confirmation email after registration
- I want to join a waitlist if class is full
- I want to cancel my registration

**As an Admin:**

- I want to set cancellation policies
- I want to process refunds
- I want to see all registrations for a class

### Technical Tasks

#### Database

- [ ] Create `ClassRegistration` model
- [ ] Create `ClassRegistrationSession` junction table
- [ ] Create `ClassWaitlist` model
- [ ] Add payment tracking fields
- [ ] Generate and apply migration

#### Backend API

- [ ] `GET /api/classes/:id/availability` - Get class with available sessions
- [ ] `POST /api/classes/:id/register` - Register for class
- [ ] `POST /api/sessions/:id/register` - Register for single session
- [ ] `GET /api/my-registrations` - Customer's registrations
- [ ] `POST /api/registrations/:id/cancel` - Cancel registration
- [ ] `POST /api/sessions/:id/waitlist` - Join waitlist
- [ ] `GET /api/admin/classes/:id/registrations` - Admin view registrations
- [ ] `POST /api/admin/registrations/:id/refund` - Process refund

#### Payment Integration

- [ ] Set up Stripe account
- [ ] Install Stripe SDK
- [ ] Create payment intent endpoint
- [ ] Handle payment webhooks
- [ ] Store payment confirmation
- [ ] Implement refund logic

#### Frontend Components

- [ ] `ClassCatalog.tsx` - Browse classes with availability
- [ ] `ClassDetailPage.tsx` - Detailed class view with sessions
- [ ] `RegistrationFlow.tsx` - Multi-step registration
- [ ] `PaymentForm.tsx` - Stripe payment integration
- [ ] `MyClassesPage.tsx` - Customer dashboard
- [ ] `RegistrationConfirmation.tsx` - Confirmation page
- [ ] `WaitlistStatus.tsx` - Waitlist position display

#### Email Templates

- [ ] Registration confirmation email
- [ ] Cancellation confirmation email
- [ ] Waitlist notification email (when spot opens)
- [ ] Payment receipt email

#### Testing

- [ ] Register for single session with payment
- [ ] Register for full course with payment
- [ ] Verify email confirmation sent
- [ ] Fill class to capacity
- [ ] Join waitlist when full
- [ ] Cancel registration and verify refund
- [ ] View My Classes page

### Deliverables

- Customers can browse classes with availability
- Single session and full course registration
- Payment processing with Stripe
- Email confirmations
- Waitlist functionality
- Customer dashboard showing registered classes

---

## Phase 3E: Attendance & Check-in (2 weeks)

### User Stories

**As a Staff Member:**

- I want to check students in as they arrive
- I want to search for students by name
- I want to mark attendance (present, absent, late)
- I want to see my teaching history

**As a Customer:**

- I want to see which classes I've attended
- I want to see which classes I missed

**As a Manager:**

- I want to see attendance reports for the week
- I want to know which staff taught which classes
- I want to track no-show rates

### Technical Tasks

#### Database

- [ ] Create `ClassAttendance` model
- [ ] Add attendance tracking fields
- [ ] Generate and apply migration

#### Backend API

- [ ] `GET /api/staff/sessions/:id/roster` - Get session roster
- [ ] `POST /api/staff/sessions/:id/check-in` - Check in student
- [ ] `PUT /api/staff/attendance/:id` - Update attendance status
- [ ] `GET /api/staff/my-teaching-history` - Staff teaching record
- [ ] `GET /api/customers/:id/attendance-history` - Customer attendance
- [ ] `GET /api/admin/reports/attendance` - Manager attendance report

#### Frontend Components

- [ ] `CheckInInterface.tsx` - Staff check-in screen
- [ ] `StudentSearch.tsx` - Search students by name
- [ ] `AttendanceRoster.tsx` - Display session roster
- [ ] `AttendanceHistory.tsx` - Customer's attendance history
- [ ] `TeachingHistory.tsx` - Staff teaching record
- [ ] `AttendanceReport.tsx` - Manager weekly report

#### Real-time Features

- [ ] Socket.io for live attendance updates
- [ ] Real-time roster updates as students check in

#### Testing

- [ ] Staff checks in multiple students
- [ ] Mark student as late
- [ ] Mark registered student as absent
- [ ] View customer attendance history
- [ ] View staff teaching history
- [ ] Generate manager weekly report

### Deliverables

- Staff check-in interface with search
- Real-time attendance tracking
- Customer attendance history
- Staff teaching history
- Manager attendance reports

---

## Phase 3F: Notifications & Reminders (1-2 weeks)

### User Stories

**As a Customer:**

- I want to receive a reminder 24 hours before class
- I want confirmation emails when I register
- I want notification if my class is cancelled
- I want notification when I move off the waitlist

**As a Staff Member:**

- I want notification when assigned to a class

**As an Admin:**

- I want to configure reminder timing

### Technical Tasks

#### Backend Services

- [ ] Set up SendGrid account
- [ ] Install SendGrid SDK
- [ ] Optional: Set up Twilio for SMS
- [ ] Create notification queue system
- [ ] Build notification worker/cron job

#### Database

- [ ] Create `NotificationPreference` model
- [ ] Create `NotificationLog` model for audit trail
- [ ] Generate and apply migration

#### Backend API

- [ ] `POST /api/notifications/send` - Manual notification
- [ ] `GET /api/notifications/preferences` - Get user preferences
- [ ] `PUT /api/notifications/preferences` - Update preferences
- [ ] Scheduled job: Check for classes in 24 hours
- [ ] Scheduled job: Send reminders

#### Email Templates

- [ ] Class reminder (24 hours before)
- [ ] Registration confirmation
- [ ] Cancellation notification
- [ ] Waitlist position change
- [ ] Staff assignment notification

#### Optional: SMS Templates

- [ ] Brief class reminder text
- [ ] Cancellation alert text

#### Testing

- [ ] Send test reminder email
- [ ] Verify 24-hour reminder job
- [ ] Test registration confirmation
- [ ] Test cancellation notification
- [ ] Update user preferences

### Deliverables

- Automated 24-hour class reminders
- Registration and cancellation emails
- Waitlist notifications
- Staff assignment notifications
- User-configurable preferences

---

## Phase 3G: Studio Hours & Holiday Management (1-2 weeks)

### User Stories

**As an Admin:**

- I want to set regular hours of operation
- I want to mark holiday closures
- I want closures to show on website 2 weeks in advance
- I want to prevent class scheduling during closures
- I want Google Business Profile updated automatically

**As a Customer:**

- I want to see when the studio is open
- I want advance notice of holiday closures

### Technical Tasks

#### Database

- [ ] Create `StudioHours` model
- [ ] Create `StudioClosure` model
- [ ] Generate and apply migration

#### Backend API

- [ ] `GET /api/studio/hours` - Get studio hours
- [ ] `PUT /api/admin/studio/hours` - Update hours
- [ ] `GET /api/studio/closures` - Get upcoming closures
- [ ] `POST /api/admin/studio/closures` - Add closure
- [ ] `DELETE /api/admin/studio/closures/:id` - Remove closure
- [ ] Validation: Prevent class scheduling during closures

#### Google Business Profile Integration

- [ ] Set up Google Business Profile API
- [ ] OAuth setup for studio
- [ ] Sync hours updates to Google
- [ ] Sync special hours (closures) to Google

#### Frontend Components

- [ ] `StudioHoursManager.tsx` - Admin hours management
- [ ] `ClosureCalendar.tsx` - Admin closure management
- [ ] `StudioHoursDisplay.tsx` - Public hours display
- [ ] `ClosureNotice.tsx` - Prominent closure warnings

#### Frontend Logic

```javascript
// Show closure notice 2 weeks in advance
const twoWeeksFromNow = addDays(new Date(), 14);
const upcomingClosures = closures.filter(
  (c) => c.startDate <= twoWeeksFromNow && c.noticeDate <= new Date()
);
```

#### Testing

- [ ] Set regular hours
- [ ] Add holiday closure (2+ weeks out)
- [ ] Verify closure notice appears on website
- [ ] Attempt to schedule class during closure (verify rejection)
- [ ] Update Google Business hours
- [ ] Verify Google shows special hours

### Deliverables

- Admin can manage regular hours
- Admin can add holiday closures
- Website shows closure notices 2 weeks in advance
- System prevents class scheduling during closures
- Google Business Profile auto-updates

---

## Phase 3H: Materials & Inventory Management (2-3 weeks)

### User Stories

**As an Admin:**

- I want to maintain a material inventory
- I want to assign materials to classes (clay, glazes, tools)
- I want inventory to auto-deduct when class completes
- I want low stock alerts

**As a Staff Member:**

- I want to order materials when we're running low
- I want to see what materials are needed for my classes

**As a Manager:**

- I want to see material usage reports
- I want to manage suppliers

### Technical Tasks

#### Database

- [ ] Create `Material` model
- [ ] Create `ClassMaterial` junction table
- [ ] Create `MaterialOrder` model
- [ ] Create `Supplier` model
- [ ] Generate and apply migration

#### Backend API

- [ ] `GET /api/admin/materials` - List all materials
- [ ] `POST /api/admin/materials` - Create material
- [ ] `PUT /api/admin/materials/:id` - Update material
- [ ] `DELETE /api/admin/materials/:id` - Delete material
- [ ] `GET /api/admin/materials/low-stock` - Low stock alerts
- [ ] `POST /api/admin/classes/:id/materials` - Assign materials to class
- [ ] `POST /api/staff/materials/:id/order` - Create order
- [ ] `PUT /api/admin/orders/:id/receive` - Mark order received
- [ ] `GET /api/admin/suppliers` - List suppliers
- [ ] `POST /api/admin/suppliers` - Create supplier

#### Backend Logic

- [ ] Auto-deduct inventory after class session
- [ ] Calculate material needs based on class size
- [ ] Low stock threshold alerts
- [ ] Material cost tracking

#### Frontend Components

- [ ] `MaterialInventory.tsx` - Material catalog
- [ ] `MaterialForm.tsx` - Create/edit material
- [ ] `ClassMaterialAssignment.tsx` - Assign materials to class
- [ ] `MaterialOrderForm.tsx` - Staff ordering interface
- [ ] `LowStockAlerts.tsx` - Dashboard widget
- [ ] `SupplierManagement.tsx` - Supplier CRUD
- [ ] `MaterialUsageReport.tsx` - Usage analytics

#### Testing

- [ ] Add materials to inventory
- [ ] Assign materials to class (2 lbs clay per student)
- [ ] Complete class session with 10 students
- [ ] Verify 20 lbs deducted from inventory
- [ ] Trigger low stock alert
- [ ] Staff member creates material order
- [ ] Admin marks order as received
- [ ] View material usage report

### Deliverables

- Material inventory management
- Material assignment to classes
- Auto-deduction on class completion
- Low stock alerts
- Staff ordering system
- Supplier management
- Material usage reporting

---

## Implementation Strategy

### Recommended Phase Order

1. **Phase 3A** (Teaching Roles) - Foundation for staff management
2. **Phase 3B** (Schedule Patterns) - Core scheduling functionality
3. **Phase 3C** (Staff Scheduling) - Requires 3A & 3B
4. **Phase 3D** (Registration) - Revenue-generating, requires 3B
5. **Phase 3F** (Notifications) - Enhances 3D with reminders
6. **Phase 3E** (Attendance) - Requires 3D for registrations
7. **Phase 3G** (Studio Hours) - Can be done anytime after 3B
8. **Phase 3H** (Materials) - Can be done last

### MVP Approach (Faster Go-to-Market)

If you want to launch faster, prioritize these phases:

**Month 1:**

- Phase 3A: Teaching Roles (1 week)
- Phase 3B: Schedule Patterns (2-3 weeks)

**Month 2:**

- Phase 3D: Registration (3-4 weeks)

**Month 3:**

- Phase 3F: Notifications (1 week)
- Phase 3E: Attendance (2 weeks)

**Launch with these 5 phases**, then continue with 3C, 3G, 3H post-launch.

### Testing Strategy

Each phase should include:

- Unit tests for backend logic
- API integration tests
- Frontend component tests
- Manual UAT checklist
- Load testing for critical paths (registration, check-in)

### Migration Strategy

- Use Prisma migrations for all schema changes
- Back up production data before each phase
- Test migrations on staging environment first
- Plan for data seeding in each phase

---

## Next Steps

1. Review this plan and prioritize phases
2. Decide on MVP vs full feature set
3. Set up project tracking (Jira/Linear/GitHub Projects)
4. Create tickets for Phase 3A
5. Begin implementation!
