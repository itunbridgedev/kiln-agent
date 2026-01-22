# TODO & Roadmap

## Phase 3A - Teaching Roles & Staff Management ✓ COMPLETE

### Completed ✓

#### Database

- [x] Create TeachingRole model with studioId
- [x] Create StaffTeachingRole junction table
- [x] Add teachingRoleId to Class model
- [x] Remove instructorName field from Class model
- [x] Generate and apply migrations

#### Backend API

- [x] GET /api/admin/teaching-roles - List all roles
- [x] POST /api/admin/teaching-roles - Create role
- [x] PUT /api/admin/teaching-roles/:id - Update role
- [x] DELETE /api/admin/teaching-roles/:id - Soft delete role
- [x] GET /api/admin/teaching-roles/staff/all - List staff with roles
- [x] POST /api/admin/teaching-roles/staff/:userId/roles - Assign role
- [x] DELETE /api/admin/teaching-roles/staff/:userId/roles/:roleId - Remove role
- [x] GET /api/admin/users - Search users
- [x] GET /api/admin/users/:id - Get user with roles
- [x] PUT /api/admin/users/:id/roles - Update user system roles

#### Frontend Components

- [x] TeachingRoleForm component (create/edit)
- [x] TeachingRoleTable component (list with staff view)
- [x] UserSearch component (autocomplete)
- [x] UserRoleEditor modal (role-based permissions)
- [x] StaffRoleAssignment modal (system + teaching roles)
- [x] ClassForm updated with teaching role selector
- [x] ClassTable updated (Role column, clickable rows, trash icon)
- [x] Teaching role filter on Classes list (multi-select dropdown)
- [x] AdminSidebar updated (Teaching Roles and Users tabs)

#### Features

- [x] User promotion workflow (self-registration → admin promotes → assign teaching roles)
- [x] Role-based permissions (Admin assigns all, Manager assigns Staff/Customer, Staff view-only)
- [x] Classes link to teaching roles instead of specific instructor names
- [x] Prisma middleware fix for StaffTeachingRole tenant filtering
- [x] Sidebar collapse behavior for Users tab

#### Category Management UX Improvements ✓

- [x] Moved Categories from Product Catalog to Classes module
- [x] Removed Product Catalog section from sidebar
- [x] Filter categories to show only Classes subcategories (hide system categories)
- [x] Auto-set parent category to Classes system category in form
- [x] Remove parent category selector from category form
- [x] Remove display order input field from form
- [x] Implement drag-and-drop reordering for categories
- [x] Add drag handle icon to category table
- [x] Replace Edit text with pencil icon
- [x] Replace Delete text with trash icon
- [x] Visual feedback for drag operations (opacity, border)
- [x] Batch API updates for reordering

---

## Current Sprint: Classes Module - Basic Setup ✓

### Completed ✓

- [x] Remove Product model from schema
- [x] Create migration to drop Product table
- [x] Update backend API routes for classes
- [x] Remove Product CRUD endpoints from admin
- [x] Delete ProductForm and ProductTable components
- [x] Update AdminSidebar to remove Products tab
- [x] Add category selector to ClassForm
- [x] Frontend compiles without Product references

### Testing Phase

- [ ] Test ClassForm category selector with subcategories
- [ ] Verify classes display correctly in product catalog
- [ ] End-to-end testing of class creation flow

---

# Classes Module - Advanced Features Breakdown

## Phase 3A: Teaching Roles & Staff Management ✓ COMPLETE

**Goal:** Enable role-based teaching assignments and staff scheduling

### Features

- [x] Teaching role definitions (custom roles with any name - more flexible than predefined)
- [x] Staff member management with role assignments
- [x] Link classes to teaching roles (not specific teachers)
- [ ] Staff profile pages with qualifications and assigned roles
  - [ ] Create staff profile page component
  - [ ] Display user's teaching roles and qualifications
  - [ ] Show classes assigned to each staff member
  - [ ] Add certification dates and notes display
  - [ ] Link from staff table to individual profiles

### Schema Design

```prisma
model TeachingRole {
  id          Int      @id @default(autoincrement())
  name        String   // "Basic Teacher", "Glazing Specialist"
  description String?
  studioId    Int
  studio      Studio   @relation(fields: [studioId])

  staffRoles  StaffTeachingRole[]
  classes     Class[]
}

model StaffTeachingRole {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId])
  roleId    Int
  role      TeachingRole @relation(fields: [roleId])
  certifiedAt DateTime?
  notes     String?

  @@unique([userId, roleId])
}

// Update existing Class model
model Class {
  // ... existing fields
  teachingRoleId Int?
  teachingRole   TeachingRole? @relation(fields: [teachingRoleId])
}
```

### Implementation Steps

1. [x] Create TeachingRole and StaffTeachingRole models
2. [x] Build admin UI for role management
3. [x] Add staff management interface (assign roles to users)
4. [x] Update ClassForm to select teaching role instead of instructor string
5. [x] API endpoints for role CRUD operations

### Estimated Effort: 1-2 weeks

---

## Phase 3B: Class Schedule Patterns

**Goal:** Define repeating schedules for classes and one-off sessions

### Features

- [ ] Recurring schedule patterns (weekly, bi-weekly, monthly)
- [ ] Pattern-based session generation
- [ ] One-off class scheduling
- [ ] Schedule preview before committing
- [ ] Bulk session creation from patterns

### Schema Design

```prisma
model ClassSchedulePattern {
  id              Int      @id @default(autoincrement())
  classId         Int
  class           Class    @relation(fields: [classId])

  // Pattern definition
  recurrenceRule  String   // RRULE format (iCal standard)
  startDate       DateTime
  endDate         DateTime?

  // Time slots
  dayOfWeek       Int      // 0=Sunday, 6=Saturday
  startTime       String   // "09:00"
  duration        Float    // in hours

  // Capacity
  defaultMaxStudents Int
  location        String?

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
}

// Update ClassSession
model ClassSession {
  id              Int      @id @default(autoincrement())
  classId         Int
  class           Class    @relation(fields: [classId])

  // Link to pattern (null for one-offs)
  schedulePatternId Int?
  schedulePattern ClassSchedulePattern? @relation(fields: [schedulePatternId])

  sessionNumber   Int?
  startDateTime   DateTime
  endDateTime     DateTime
  maxStudents     Int      // Can override pattern default
  currentEnrollment Int    @default(0)
  location        String?
  notes           String?
  isCancelled     Boolean  @default(false)

  registrations   ClassRegistration[]
  attendance      ClassAttendance[]
}
```

### Implementation Steps

1. [ ] Implement RRULE parser/generator for recurring patterns
2. [ ] Create ClassSchedulePattern model and UI
3. [ ] Build schedule preview component
4. [ ] Session auto-generation from patterns
5. [ ] One-off session creation interface
6. [ ] Edit/cancel individual sessions from pattern

### Estimated Effort: 2-3 weeks

---

## Phase 3C: Staff Scheduling & Availability

**Goal:** Manager-controlled staff scheduling with dynamic class capacity

### Features

- [ ] Staff availability patterns (regular schedule)
- [ ] Ad-hoc schedule modifications
- [ ] Staff-to-session assignments
- [ ] Dynamic maxStudents based on assigned staff count
- [ ] Conflict detection (double-booking prevention)
- [ ] Staff calendar view

### Schema Design

```prisma
model StaffSchedulePattern {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(fields: [userId])

  dayOfWeek   Int
  startTime   String
  endTime     String
  isRecurring Boolean  @default(true)
  effectiveFrom DateTime
  effectiveUntil DateTime?

  studioId    Int
  studio      Studio   @relation(fields: [studioId])
}

model StaffScheduleException {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(fields: [userId])

  date        DateTime
  startTime   String?
  endTime     String?
  isAvailable Boolean  // false = time off
  reason      String?

  studioId    Int
  studio      Studio   @relation(fields: [studioId])
}

model SessionStaffAssignment {
  id              Int      @id @default(autoincrement())
  sessionId       Int
  session         ClassSession @relation(fields: [sessionId])
  userId          Int
  user            User     @relation(fields: [userId])
  assignedAt      DateTime @default(now())
  assignedBy      Int

  @@unique([sessionId, userId])
}
```

### Implementation Steps

1. [ ] Create staff scheduling models
2. [ ] Build manager interface for staff schedule management
3. [ ] Implement conflict detection algorithm
4. [ ] Auto-adjust maxStudents based on assigned staff
5. [ ] Staff calendar view with assigned sessions
6. [ ] Schedule exception handling

### Estimated Effort: 2-3 weeks

---

## Phase 3D: Customer Registration & Enrollment

**Goal:** Allow customers to register for individual sessions or full courses

### Features

- [ ] Browse available classes with dates/times
- [ ] Register for single session
- [ ] Register for entire course (all sessions)
- [ ] Payment integration (Stripe/PayPal)
- [ ] Registration confirmation emails
- [ ] Waitlist for fully booked sessions
- [ ] Cancellation and refund policies

### Schema Design

```prisma
model ClassRegistration {
  id              Int      @id @default(autoincrement())
  customerId      Int
  customer        User     @relation(fields: [customerId])
  sessionId       Int?
  session         ClassSession? @relation(fields: [sessionId])
  classId         Int      // For course-level registration
  class           Class    @relation(fields: [classId])

  registrationType RegistrationType // SINGLE_SESSION | FULL_COURSE
  registeredAt    DateTime @default(now())
  status          RegistrationStatus // PENDING | CONFIRMED | CANCELLED | WAITLISTED

  amountPaid      Decimal
  paymentId       String?
  paymentStatus   PaymentStatus

  sessions        ClassRegistrationSession[] // For course registrations
}

model ClassRegistrationSession {
  id              Int      @id @default(autoincrement())
  registrationId  Int
  registration    ClassRegistration @relation(fields: [registrationId])
  sessionId       Int
  session         ClassSession @relation(fields: [sessionId])

  @@unique([registrationId, sessionId])
}

model ClassWaitlist {
  id          Int      @id @default(autoincrement())
  customerId  Int
  customer    User     @relation(fields: [customerId])
  sessionId   Int
  session     ClassSession @relation(fields: [sessionId])
  joinedAt    DateTime @default(now())
  notified    Boolean  @default(false)
  position    Int
}
```

### Implementation Steps

1. [ ] Create registration models
2. [ ] Build class catalog with availability display
3. [ ] Single session registration flow
4. [ ] Full course registration flow
5. [ ] Payment integration (Stripe)
6. [ ] Email confirmation system
7. [ ] Waitlist management
8. [ ] Customer dashboard (My Classes)

### Estimated Effort: 3-4 weeks

---

## Phase 3E: Attendance & Check-in

**Goal:** Track student attendance and staff teaching records

### Features

- [ ] Staff check-in interface (scan/search customers)
- [ ] Real-time attendance marking
- [ ] Attendance history for customers
- [ ] Staff calendar with taught classes
- [ ] Manager attendance reports
- [ ] No-show tracking and policies

### Schema Design

```prisma
model ClassAttendance {
  id              Int      @id @default(autoincrement())
  sessionId       Int
  session         ClassSession @relation(fields: [sessionId])
  customerId      Int
  customer        User     @relation(fields: [customerId])

  status          AttendanceStatus // PRESENT | ABSENT | LATE | EXCUSED
  checkedInAt     DateTime?
  checkedInBy     Int?
  checkedInByUser User?    @relation(fields: [checkedInBy], name: "CheckedInBy")

  notes           String?

  @@unique([sessionId, customerId])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  EXCUSED
}
```

### Implementation Steps

1. [ ] Create attendance model
2. [ ] Build staff check-in interface
3. [ ] Customer search/scan functionality
4. [ ] Real-time attendance updates
5. [ ] Customer attendance history view
6. [ ] Staff teaching calendar
7. [ ] Manager reporting dashboard

### Estimated Effort: 2 weeks

---

## Phase 3F: Notifications & Reminders

**Goal:** Automated reminders for upcoming classes

### Features

- [ ] Email/SMS reminder 24 hours before class
- [ ] Configurable reminder timing
- [ ] Registration confirmation notifications
- [ ] Cancellation notifications
- [ ] Waitlist position notifications
- [ ] Staff assignment notifications

### Implementation Steps

1. [ ] Set up notification service (SendGrid/Twilio)
2. [ ] Create notification queue system
3. [ ] Build notification templates
4. [ ] Scheduled job for 24-hour reminders
5. [ ] Real-time notifications for bookings
6. [ ] User notification preferences

### Estimated Effort: 1-2 weeks

---

## Phase 3G: Studio Hours & Holiday Management

**Goal:** Manage studio hours with holiday closures

### Features

- [ ] Define regular hours of operation
- [ ] Holiday closure calendar
- [ ] 2-week advance closure notices on website
- [ ] Google Business Profile integration
- [ ] Prevent class scheduling during closures
- [ ] Customer notifications for affected classes

### Schema Design

```prisma
model StudioHours {
  id          Int      @id @default(autoincrement())
  studioId    Int
  studio      Studio   @relation(fields: [studioId])

  dayOfWeek   Int
  openTime    String
  closeTime   String
  isClosed    Boolean  @default(false)
}

model StudioClosure {
  id          Int      @id @default(autoincrement())
  studioId    Int
  studio      Studio   @relation(fields: [studioId])

  name        String   // "Thanksgiving", "Summer Break"
  startDate   DateTime
  endDate     DateTime
  reason      String?
  displayNotice Boolean @default(true)
  noticeDate  DateTime // When to start showing notice

  createdAt   DateTime @default(now())
}
```

### Implementation Steps

1. [ ] Create studio hours models
2. [ ] Admin UI for hours management
3. [ ] Holiday closure interface
4. [ ] Website display with closure notices
5. [ ] Google Business API integration
6. [ ] Validate class schedules against closures

### Estimated Effort: 1-2 weeks

---

## Phase 3H: Materials & Inventory Management

**Goal:** Track materials used per class and inventory levels

### Features

- [ ] Material catalog
- [ ] Inventory tracking
- [ ] Class material assignments
- [ ] Auto-deduct on class completion
- [ ] Low stock alerts
- [ ] Staff material ordering
- [ ] Supplier management

### Schema Design

```prisma
model Material {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  sku         String   @unique
  unit        String   // "lbs", "bags", "pieces"
  currentStock Decimal
  reorderPoint Decimal
  costPerUnit Decimal
  supplierId  Int?
  supplier    Supplier? @relation(fields: [supplierId])
  studioId    Int
  studio      Studio   @relation(fields: [studioId])

  classMaterials ClassMaterial[]
  orders      MaterialOrder[]
}

model ClassMaterial {
  id          Int      @id @default(autoincrement())
  classId     Int
  class       Class    @relation(fields: [classId])
  materialId  Int
  material    Material @relation(fields: [materialId])

  quantityPerStudent Decimal
  notes       String?

  @@unique([classId, materialId])
}

model MaterialOrder {
  id          Int      @id @default(autoincrement())
  materialId  Int
  material    Material @relation(fields: [materialId])

  quantity    Decimal
  orderedBy   Int
  orderedByUser User   @relation(fields: [orderedBy])
  orderedAt   DateTime @default(now())

  status      OrderStatus // PENDING | ORDERED | RECEIVED
  expectedDelivery DateTime?
  receivedAt  DateTime?

  supplierId  Int?
  supplier    Supplier? @relation(fields: [supplierId])
  cost        Decimal?
}

model Supplier {
  id          Int      @id @default(autoincrement())
  name        String
  contactEmail String?
  contactPhone String?
  website     String?
  notes       String?
  studioId    Int
  studio      Studio   @relation(fields: [studioId])

  materials   Material[]
  orders      MaterialOrder[]
}
```

### Implementation Steps

1. [ ] Create material inventory models
2. [ ] Material catalog admin UI
3. [ ] Assign materials to classes
4. [ ] Auto-deduction on session completion
5. [ ] Low stock alerts
6. [ ] Staff ordering interface
7. [ ] Supplier management

### Estimated Effort: 2-3 weeks

---

## Phase 4: Firings Module

### Features

- [ ] Kiln firing schedule management
- [ ] Bisque vs glaze firing types
- [ ] Cone temperature tracking
- [ ] Shelf/kiln space reservation
- [ ] Firing cost calculation
- [ ] Member notification system

### Schema Design

```prisma
model Firing {
  id            Int      @id @default(autoincrement())
  name          String
  firingType    FiringType // BISQUE, GLAZE, RAKU, etc.
  categoryId    Int
  category      ProductCategory @relation(fields: [categoryId])
  coneRating    String   // "Cone 6", "Cone 10", etc.
  scheduledDate DateTime
  maxItems      Int
  costPerPiece  Decimal
  kilnName      String
  studioId      Int
  studio        Studio   @relation(fields: [studioId])

  reservations  FiringReservation[]
}
```

### Implementation Steps

1. [ ] Create Prisma schema for Firing and FiringReservation
2. [ ] Generate migration
3. [ ] Create backend API routes
4. [ ] Build admin UI (FiringForm, FiringCalendar)
5. [ ] Add to product catalog display
6. [ ] Member reservation interface

## Phase 5: Memberships Module

### Features

- [ ] Membership tier definitions (Basic, Studio Access, Unlimited)
- [ ] Recurring billing integration
- [ ] Member benefits tracking
- [ ] Access control based on membership level
- [ ] Membership renewal reminders

### Schema Design

```prisma
model Membership {
  id              Int      @id @default(autoincrement())
  name            String   // "Basic", "Studio Access", "Unlimited"
  description     String
  categoryId      Int
  category        ProductCategory @relation(fields: [categoryId])
  price           Decimal
  billingPeriod   BillingPeriod // MONTHLY, QUARTERLY, ANNUAL
  benefits        Json     // Flexible JSON for various benefits
  maxClassCredits Int?
  studioAccessHours String? // "24/7", "9am-9pm", etc.
  studioId        Int
  studio          Studio   @relation(fields: [studioId])

  subscriptions   MembershipSubscription[]
}
```

### Implementation Steps

1. [ ] Design membership benefit system
2. [ ] Create Prisma schema
3. [ ] Integrate payment processing (Stripe/PayPal)
4. [ ] Build admin UI for membership management
5. [ ] Member signup and billing portal
6. [ ] Access control middleware

## Phase 6: Retail Module

### Features

- [ ] Pottery supply inventory
- [ ] Tool rental system
- [ ] Merchandise sales
- [ ] Stock level tracking
- [ ] Order fulfillment
- [ ] Point of sale integration

### Schema Design

```prisma
model RetailItem {
  id          Int      @id @default(autoincrement())
  name        String
  description String
  categoryId  Int
  category    ProductCategory @relation(fields: [categoryId])
  sku         String   @unique
  price       Decimal
  stockLevel  Int
  reorderPoint Int
  supplier    String?
  isRental    Boolean  @default(false)
  rentalPeriod String? // "Daily", "Weekly"
  studioId    Int
  studio      Studio   @relation(fields: [studioId])

  orders      OrderItem[]
}
```

## Technical Improvements

### High Priority

- [ ] Image upload system (AWS S3 or Cloudinary)
- [ ] Email notification service (SendGrid/AWS SES)
- [ ] Error logging and monitoring (Sentry)
- [ ] API rate limiting
- [ ] Database connection pooling optimization

### Medium Priority

- [ ] Search functionality across classes and products
- [ ] Advanced filtering (by date, skill level, instructor)
- [ ] Calendar view for classes and firings
- [ ] Waitlist system for fully booked classes
- [ ] Customer reviews and ratings

### Low Priority

- [ ] Mobile app (React Native)
- [ ] Analytics dashboard for studio owners
- [ ] Marketing automation
- [ ] Gift certificate system
- [ ] Social media integration

## Bug Fixes

### Critical

- None currently identified

### Minor

- [ ] Middleware deprecation warning (migrate to Next.js proxy pattern)
- [ ] Multiple lockfile resolution
- [ ] util.\_extend deprecation warnings

## Documentation

### Needed

- [ ] API endpoint documentation (OpenAPI/Swagger)
- [ ] Admin user guide
- [ ] Customer user guide
- [ ] Development setup guide
- [ ] Deployment guide
- [ ] Database backup and restore procedures

## Performance Optimization

- [ ] Database query optimization (add indexes where needed)
- [ ] Implement caching strategy (Redis)
- [ ] Image optimization and lazy loading
- [ ] Code splitting for frontend
- [ ] API response compression
- [ ] CDN setup for static assets

## Testing

- [ ] Unit tests for backend API routes
- [ ] Integration tests for database operations
- [ ] E2E tests for critical user flows
- [ ] Load testing for multi-tenant scenarios
- [ ] Security audit and penetration testing

## Notes

- Classes module now uses direct category linkage (no Product intermediary)
- Follow same pattern for Firings, Memberships, Retail modules
- All feature modules must support subcategory organization
- Maintain tenant isolation at all times
- Keep admin UI consistent across modules (use existing component patterns)
