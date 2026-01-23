# Calendar & Scheduling Vision

## Overview

This document outlines the vision for a rich calendar and scheduling system for the Pottery Studio App, balancing the power of tools like Outlook with practical implementation approaches.

## Core Requirements

### 1. Staff Individual Calendar View

**User Story:** As a staff member, I want to see my personal schedule in a familiar calendar interface so I can manage my teaching commitments.

**Features:**

- Outlook-style week/month/day views
- Color-coded sessions by class type or teaching role
- Click-through to class details
- Visual indicators for:
  - Confirmed sessions
  - Pending assignments
  - Time-off requests
  - Conflicts/overlaps
- Responsive mobile view for on-the-go access

### 2. Studio-Wide Calendar View

**User Story:** As an admin, I want to see all scheduled classes across the studio so I can manage capacity and avoid conflicts.

**Features:**

- Multi-resource calendar view (shows all staff schedules simultaneously)
- Filter by:
  - Teaching role
  - Staff member
  - Class type/category
  - Location/room
- Drag-and-drop rescheduling
- Capacity indicators (current enrollment / max students)
- Visual conflict warnings
- Quick-add new sessions

### 3. External Calendar Sync

**User Story:** As a staff member, I want my teaching schedule to sync with my personal calendar so I don't have to maintain two calendars.

**Supported Platforms:**

- Google Calendar (via Google Calendar API)
- Microsoft Outlook/Office 365 (via Microsoft Graph API)
- iOS Calendar (via CalDAV or subscription feeds)
- Generic iCal/ICS subscription feeds (universal compatibility)

**Sync Types:**

- **One-way sync (Push):** Studio schedule → Personal calendar (recommended to start)
- **Two-way sync (Advanced):** Availability blocking in personal calendar affects studio availability

### 4. Recurring Pattern Management

**User Story:** As an admin, I want to create a class that meets every Tuesday for 8 weeks and make changes that apply to all future sessions.

**Features:**

- Create recurring patterns with RRULE standard
- Modify pattern:
  - "This session only" - one-off override
  - "This and future sessions" - pattern split
  - "All sessions" - retroactive pattern change
- Visual indication of pattern vs one-off sessions
- Bulk operations on series

## Technical Implementation Strategy

### Calendar UI Libraries

Instead of building from scratch, leverage proven calendar libraries:

#### Option 1: FullCalendar (Recommended)

- **Website:** https://fullcalendar.io/
- **License:** MIT (free) + Premium plugins (paid)
- **React Integration:** `@fullcalendar/react`
- **Pros:**
  - Industry standard, battle-tested
  - Rich feature set (drag-drop, resource views, timeline)
  - Excellent documentation
  - Active development
  - Mobile-responsive
- **Cons:**
  - Premium features require license ($450/dev)
  - Resource view, timeline are premium features
- **Best For:** Studio-wide admin calendar

**Free Features:**

- Month, week, day, list views
- Event rendering and styling
- Click/hover interactions
- Background events
- Recurring events

**Premium Features ($450/dev):**

- Resource timeline view (perfect for staff scheduling)
- Vertical resource view
- Resource grouping
- Drag-to-create events

#### Option 2: React Big Calendar

- **GitHub:** https://github.com/jquense/react-big-calendar
- **License:** MIT (fully free)
- **Pros:**
  - Completely free and open source
  - Google Calendar-like interface
  - Good for basic calendar needs
  - Drag-and-drop support
- **Cons:**
  - Less feature-rich than FullCalendar
  - Resource views require custom implementation
  - Smaller community
- **Best For:** Staff individual calendars

#### Option 3: TUI Calendar

- **Website:** https://ui.toast.com/tui-calendar
- **License:** MIT (free)
- **Pros:**
  - Beautiful UI
  - Free and open source
  - Good mobile support
  - Multiple view types
- **Cons:**
  - Less popular, smaller ecosystem
  - Documentation primarily in Korean (though has English)

### External Calendar Integration

#### 1. Google Calendar API

**Implementation:**

- Use Google Calendar API v3
- OAuth 2.0 for user authorization
- Create calendar events via API

**Features We Can Support:**

- Create/update/delete events
- Set reminders
- Add descriptions with links back to studio app
- Handle recurring events
- Send email notifications via Google

**npm packages:**

```bash
npm install googleapis @google-cloud/local-auth
```

**Basic Flow:**

```typescript
import { google } from "googleapis";

// After OAuth, create event
const calendar = google.calendar({ version: "v3", auth });

await calendar.events.insert({
  calendarId: "primary",
  requestBody: {
    summary: "Pottery Class - Wheel Throwing 101",
    description: "View details: https://kilnagent.com/classes/123",
    start: {
      dateTime: "2026-01-25T10:00:00-07:00",
      timeZone: "America/Denver",
    },
    end: {
      dateTime: "2026-01-25T12:00:00-07:00",
      timeZone: "America/Denver",
    },
    colorId: "10", // Green for teaching
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 }, // 1 day before
        { method: "popup", minutes: 30 },
      ],
    },
  },
});
```

**Cost:** Free up to generous quotas (10,000 requests/day)

**Documentation:** https://developers.google.com/calendar

#### 2. Microsoft Graph API (Outlook/Office 365)

**Implementation:**

- Use Microsoft Graph API
- OAuth 2.0 with Microsoft identity platform
- Create events in user's Outlook calendar

**Features We Can Support:**

- Create/update/delete calendar events
- Set reminders and categories
- Handle recurring events
- Teams meeting integration (bonus)
- Access availability (for two-way sync)

**npm packages:**

```bash
npm install @microsoft/microsoft-graph-client @azure/msal-node
```

**Basic Flow:**

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

const event = {
  subject: "Pottery Class - Wheel Throwing 101",
  body: {
    contentType: "HTML",
    content:
      '<a href="https://kilnagent.com/classes/123">View class details</a>',
  },
  start: {
    dateTime: "2026-01-25T10:00:00",
    timeZone: "Mountain Standard Time",
  },
  end: {
    dateTime: "2026-01-25T12:00:00",
    timeZone: "Mountain Standard Time",
  },
  categories: ["Pottery Studio", "Teaching"],
  isReminderOn: true,
  reminderMinutesBeforeStart: 30,
};

await client.api("/me/events").post(event);
```

**Cost:** Free for users with Microsoft 365/Outlook.com accounts

**Documentation:** https://learn.microsoft.com/en-us/graph/api/user-post-events

#### 3. iCal/ICS Feeds (iOS Calendar & Universal)

**Implementation:**

- Generate ICS (iCalendar) files
- Provide webcal:// subscription URLs
- Works with iOS Calendar, Google Calendar, Outlook, and most calendar apps

**Approach: Calendar Subscription (Read-Only)**

- User subscribes to their personal feed URL
- Calendar auto-updates when schedule changes
- No OAuth required, just unique token per user

**npm packages:**

```bash
npm install ical-generator
```

**Basic Flow:**

```typescript
import ical from "ical-generator";

// Generate calendar feed
const calendar = ical({ name: "My Pottery Studio Schedule" });

staffSessions.forEach((session) => {
  calendar.createEvent({
    start: session.startDateTime,
    end: session.endDateTime,
    summary: `${session.class.name} - ${session.class.teachingRole.name}`,
    description: `View details: https://kilnagent.com/classes/${session.classId}`,
    location: session.location || "Main Studio",
    url: `https://kilnagent.com/classes/${session.classId}`,
    categories: [session.class.category.name],
    status: session.isCancelled ? "cancelled" : "confirmed",
  });
});

// Serve at: GET /api/calendar/feed/:userId/:token
return calendar.toString();
```

**iOS Setup:**

1. Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar
2. Enter URL: `webcal://kilnagent.com/api/calendar/feed/user123/token456`

**Pros:**

- Universal compatibility (works everywhere)
- No OAuth complexity
- Auto-updates
- Easy setup for users

**Cons:**

- Read-only (can't create events from iOS Calendar)
- Requires polling/updates to see changes

**Cost:** Free, just generate and serve

### Recommended Architecture

#### Phase 1: Foundation (MVP)

**Timeline: 2-3 weeks**

1. **Database Schema**
   - Extend ClassSession with calendar metadata
   - Add ExternalCalendarSync tracking table
   - Store user calendar preferences

2. **Staff Individual Calendar**
   - Implement React Big Calendar (free)
   - Week/Month/Day views
   - Click-through to class details
   - Show only user's assigned sessions

3. **iCal Feed Subscription**
   - Generate ICS feeds per staff member
   - Unique token-based URLs
   - Auto-refresh on schedule changes
   - Universal compatibility (iOS, Google, Outlook)

**Deliverable:** Staff can view their schedule and subscribe to updates in any calendar app.

#### Phase 2: Admin Studio Calendar

**Timeline: 2-3 weeks**

1. **Studio-Wide View**
   - Implement FullCalendar with resource view
   - OR: Build custom multi-staff view with React Big Calendar
   - Show all staff schedules side-by-side
   - Filter by teaching role, category, staff member

2. **Drag-and-Drop Rescheduling**
   - Move sessions between time slots
   - Conflict detection
   - Bulk updates to recurring patterns

3. **Quick Actions**
   - Right-click context menus
   - Assign staff to sessions
   - Cancel/modify sessions
   - View enrollment details

**Deliverable:** Admin has powerful scheduling tool with visual overview.

#### Phase 3: Active Calendar Sync (Advanced)

**Timeline: 3-4 weeks**

1. **Google Calendar Integration**
   - OAuth 2.0 flow for staff
   - Create/update/delete events
   - Sync session changes bidirectionally
   - Handle recurring patterns

2. **Microsoft Outlook Integration**
   - OAuth via Microsoft Graph
   - Create/update/delete events
   - Sync with Office 365 calendars

3. **Sync Management UI**
   - Connect/disconnect calendar accounts
   - Choose sync direction (one-way or two-way)
   - Sync status and error handling
   - Re-sync button for manual refresh

**Deliverable:** Staff calendars automatically reflect studio schedule; changes sync both ways.

## Schema Extensions

```prisma
// Add to ClassSession
model ClassSession {
  id                  Int      @id @default(autoincrement())
  // ... existing fields

  // Calendar metadata
  externalEventId     String?  // Google/Outlook event ID
  calendarSyncStatus  String?  // 'synced', 'pending', 'error'
  lastSyncedAt        DateTime?

  staffAssignments    SessionStaffAssignment[]
}

// Track staff calendar connections
model StaffCalendarConnection {
  id              Int      @id @default(autoincrement())
  userId          Int
  user            User     @relation(fields: [userId])
  studioId        Int
  studio          Studio   @relation(fields: [studioId])

  provider        String   // 'google', 'microsoft', 'ical'
  isActive        Boolean  @default(true)
  syncDirection   String   // 'push', 'pull', 'both'

  // OAuth tokens (encrypted)
  accessToken     String?
  refreshToken    String?
  expiresAt       DateTime?

  // iCal subscription
  subscriptionToken String?  @unique

  createdAt       DateTime @default(now())
  lastSyncedAt    DateTime?
  syncErrors      String?  // JSON array of recent errors

  @@unique([userId, provider])
}

// Calendar event sync log
model CalendarSyncLog {
  id              Int      @id @default(autoincrement())
  connectionId    Int
  connection      StaffCalendarConnection @relation(fields: [connectionId])
  sessionId       Int?
  session         ClassSession? @relation(fields: [sessionId])

  action          String   // 'create', 'update', 'delete'
  status          String   // 'success', 'error'
  errorMessage    String?
  syncedAt        DateTime @default(now())
}
```

## User Experience Flows

### Flow 1: Staff Views Personal Schedule

1. Staff logs in → navigates to "My Schedule"
2. Calendar loads showing assigned sessions
3. Color-coded by class type
4. Click session → modal with details and link to class management
5. Button: "Subscribe to Calendar" → shows instructions for iOS/Google/Outlook

### Flow 2: Staff Syncs Calendar (Advanced)

1. Staff navigates to Settings → Calendar Sync
2. Clicks "Connect Google Calendar" or "Connect Outlook"
3. OAuth flow → authorization
4. Chooses sync direction:
   - "Push only" - Studio → Personal calendar
   - "Pull availability" - Block studio schedule based on personal calendar
5. Test sync → sees event created in personal calendar
6. Future sessions auto-sync

### Flow 3: Admin Schedules Classes

1. Admin opens Studio Calendar (resource view)
2. Sees all staff schedules side-by-side
3. Drags session from unassigned pool to staff timeline
4. Conflict warning appears if staff double-booked
5. Saves → session assigned
6. Staff's calendar automatically updates (if synced)

### Flow 4: Admin Modifies Recurring Class

1. Admin clicks session in recurring series
2. Modal: "This session only" or "All future sessions"
3. Changes time and location
4. Saves
5. All future sessions update
6. External calendars sync changes within minutes

## Cost Analysis

### Option A: Free/Low-Cost (MVP)

- React Big Calendar: Free
- iCal feeds: Free
- Google/Microsoft APIs: Free (within quotas)
- **Total: $0/month**
- **Limitation:** Basic calendar UI, subscription feeds only

### Option B: Premium Features

- FullCalendar Premium: $450/developer (one-time)
- Google/Microsoft APIs: Free
- **Total: $450 one-time**
- **Benefits:** Professional resource timeline, drag-drop, better UX

### Option C: Third-Party Scheduling Service

- Calendly: $16-$67/user/month
- Acuity Scheduling: $20-$61/month
- **Total: $500-2000/month for 25 staff**
- **Pro:** Turnkey solution
- **Con:** Less customization, ongoing cost, external dependency

**Recommendation:** Option B (FullCalendar Premium) for best balance of features, cost, and control.

## Alternative: Embedded Solutions

### Option: Nylas Calendar API

- **Website:** https://www.nylas.com/
- **What it does:** Unified API for Google, Microsoft, Apple calendars
- **Pricing:** $9/user/month
- **Pros:**
  - One API for all calendar providers
  - Handles OAuth complexity
  - Real-time webhooks
  - Email/calendar/contacts unified
- **Cons:**
  - Monthly cost per user
  - External dependency
  - Overkill for basic sync

**Use case:** If you want two-way sync without managing multiple OAuth flows.

## Security Considerations

1. **OAuth Token Storage**
   - Encrypt access/refresh tokens in database
   - Use environment variable for encryption key
   - Rotate tokens regularly

2. **iCal Feed Security**
   - Unique random token per user (UUID)
   - Rate limiting on feed endpoints
   - Ability to regenerate token if compromised

3. **Calendar Event Privacy**
   - Don't sync student names to external calendars (privacy)
   - Use generic descriptions: "Pottery Class" vs "John Smith's Class"
   - Include link back to app for full details

4. **Permissions**
   - Request minimal calendar scopes
   - Clear user consent flow
   - Easy disconnect option

## Mobile Considerations

1. **Responsive Calendar Views**
   - Week view works on mobile
   - Swipe between weeks
   - Tap to view details

2. **Native Calendar Integration**
   - iOS Calendar subscription (webcal://)
   - Android Calendar sync via Google Calendar

3. **Progressive Web App (Future)**
   - Add to home screen
   - Offline session view
   - Push notifications for schedule changes

## Success Metrics

- **Adoption:** % of staff using calendar sync
- **Engagement:** Calendar page views per week
- **Efficiency:** Time saved on schedule management
- **Accuracy:** Reduction in scheduling conflicts
- **Satisfaction:** Staff calendar NPS score

## Phased Rollout Plan

### Month 1: MVP

- Staff individual calendar (read-only)
- iCal subscription feeds
- Basic admin calendar view

### Month 2: Enhancement

- Admin drag-drop scheduling
- Conflict detection
- Google Calendar OAuth integration

### Month 3: Advanced

- Microsoft Outlook integration
- Two-way availability sync
- Mobile optimization

### Month 4: Polish

- Advanced filtering and search
- Calendar analytics
- Performance optimization

## Open Questions

1. **Should we support CalDAV for two-way sync?**
   - Pro: Standard protocol, works with many apps
   - Con: More complex than OAuth APIs

2. **Should admins be able to create "ghost" staff schedules?**
   - Use case: Reserve equipment time, facility maintenance
   - Implementation: Special "resource" calendar entries

3. **How do we handle time zones?**
   - Store all times in UTC
   - Display in studio's local time or staff's preference?

4. **Notification strategy?**
   - Email reminders from app
   - Or rely on calendar app notifications?
   - Both?

## Conclusion

**Recommended Approach:**

1. **Start simple:** Build with React Big Calendar + iCal feeds (100% free)
2. **Validate:** Ensure staff use and value the calendar feature
3. **Upgrade:** If successful, invest in FullCalendar Premium for resource views
4. **Expand:** Add Google/Outlook OAuth integration for seamless sync

This approach delivers value quickly while maintaining flexibility to enhance based on real usage patterns. The calendar integration will be a major differentiator and productivity boost for your studio management app.

**Key Decision Point:** You don't need to "reinvent Outlook" - you need to provide the 20% of features that solve 80% of scheduling problems:

- See your schedule
- Sync to personal calendar
- Reschedule easily
- Avoid conflicts

The external calendar APIs handle the complexity of calendar management; you just need to create/update events via their APIs.
