import { PrismaClient } from "@prisma/client";
import express from "express";
import { isAuthenticated } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(isAuthenticated);

// GET /api/staff/my-sessions - Get authenticated user's assigned class sessions
router.get(
  "/my-sessions",
  async (req: express.Request, res: express.Response) => {
    try {
      const user = req.user as any;
      if (!user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { startDate, endDate } = req.query;

      // Build date filter if provided
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate as string);
      }
      if (endDate) {
        // Set to end of day to include all sessions on the end date
        const endDateObj = new Date(endDate as string);
        endDateObj.setHours(23, 59, 59, 999);
        dateFilter.lte = endDateObj;
      }

      console.log(
        `[my-sessions] User ${user.id} (${user.email}) querying sessions`
      );
      console.log(
        `[my-sessions] Date range: ${startDate || "none"} - ${endDate || "none"}`
      );
      console.log(
        `[my-sessions] Date filter:`,
        JSON.stringify(dateFilter, null, 2)
      );

      // Find sessions where user is assigned as instructor or assistant
      const sessions = await prisma.classSession.findMany({
        where: {
          sessionDate:
            Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          OR: [
            {
              instructors: {
                some: {
                  customerId: user.id,
                },
              },
            },
            {
              assistants: {
                some: {
                  customerId: user.id,
                },
              },
            },
          ],
        },
        include: {
          class: {
            include: {
              category: true,
            },
          },
          classStep: true,
          schedulePattern: true,
          instructors: {
            where: {
              customerId: user.id,
            },
            include: {
              role: true,
            },
          },
          assistants: {
            where: {
              customerId: user.id,
            },
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          sessionDate: "asc",
        },
      });

      // Transform sessions into calendar-friendly format
      const calendarEvents = sessions.map((session: typeof sessions[0]) => {
        const parentClass = session.class;
        const category = parentClass?.category;

        // Determine user's role for this session
        const isInstructor = session.instructors.length > 0;
        const isAssistant = session.assistants.length > 0;
        const role = isInstructor
          ? session.instructors[0]?.role
          : session.assistants[0]?.role;

        // Calculate end time from start/end time strings
        // Extract just the date components to avoid timezone issues
        const sessionDateObj = new Date(session.sessionDate);
        const year = sessionDateObj.getUTCFullYear();
        const month = sessionDateObj.getUTCMonth();
        const day = sessionDateObj.getUTCDate();

        const [startHours, startMinutes] = session.startTime
          .split(":")
          .map(Number);
        const [endHours, endMinutes] = session.endTime.split(":").map(Number);

        // Create ISO strings without timezone conversion
        const pad = (n: number) => String(n).padStart(2, "0");
        const startTime = `${year}-${pad(month + 1)}-${pad(day)}T${pad(startHours)}:${pad(startMinutes)}:00`;
        const endTime = `${year}-${pad(month + 1)}-${pad(day)}T${pad(endHours)}:${pad(endMinutes)}:00`;

        return {
          id: session.id,
          title: session.classStep
            ? `${parentClass?.name} - ${session.classStep.name}`
            : parentClass?.name,
          start: startTime,
          end: endTime,
          location: session.location,
          maxStudents: session.maxStudents,
          currentEnrollment: session.currentEnrollment,
          isCancelled: session.isCancelled,
          category: category
            ? {
                id: category.id,
                name: category.name,
              }
            : null,
          userRole: {
            type: isInstructor
              ? ("instructor" as const)
              : ("assistant" as const),
            name: role?.name || (isInstructor ? "Instructor" : "Assistant"),
          },
          schedulePattern: session.schedulePattern
            ? {
                id: session.schedulePattern.id,
                recurrenceRule: session.schedulePattern.recurrenceRule,
              }
            : null,
        };
      });

      console.log(
        `[my-sessions] User ${user.id} has ${sessions.length} sessions`
      );
      console.log(
        `[my-sessions] Returning ${calendarEvents.length} calendar events`
      );
      if (calendarEvents.length > 0) {
        console.log(
          `[my-sessions] First event:`,
          JSON.stringify(calendarEvents[0], null, 2)
        );
      }

      res.json(calendarEvents);
    } catch (error) {
      console.error("Error fetching staff sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }
);

// GET /api/staff/sessions/:id/enrollments - Get enrolled students for a session
router.get(
  "/sessions/:id/enrollments",
  async (req: express.Request, res: express.Response) => {
    try {
      const user = req.user as any;
      if (!user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const sessionId = parseInt(req.params.id);

      // Verify user is assigned to this session
      const session = await prisma.classSession.findUnique({
        where: { id: sessionId },
        include: {
          instructors: {
            where: { customerId: user.id },
          },
          assistants: {
            where: { customerId: user.id },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const isAssigned =
        session.instructors.length > 0 || session.assistants.length > 0;

      if (!isAssigned) {
        return res
          .status(403)
          .json({ error: "You are not assigned to this session" });
      }

      // Get enrollments for this session
      const registrations = await prisma.classRegistration.findMany({
        where: {
          sessions: {
            some: {
              sessionId: sessionId,
            },
          },
          registrationStatus: {
            in: ["CONFIRMED", "PENDING"],
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          registeredAt: "asc",
        },
      });

      // Format the response
      const enrollments = registrations.map((reg) => ({
        id: reg.id,
        customerName: reg.customer?.name || reg.guestName || "Unknown",
        customerEmail: reg.customer?.email || reg.guestEmail,
        customerPhone: reg.customer?.phone || reg.guestPhone,
        isGuest: !reg.customerId,
        guestCount: reg.guestCount,
        registeredAt: reg.registeredAt,
        status: reg.registrationStatus,
      }));

      res.json({
        sessionId,
        totalEnrollment: session.currentEnrollment,
        maxStudents: session.maxStudents,
        enrollments,
      });
    } catch (error) {
      console.error("Error fetching session enrollments:", error);
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  }
);

// POST /api/staff/calendar-feed/generate - Generate or regenerate calendar feed token
router.post(
  "/calendar-feed/generate",
  async (req: express.Request, res: express.Response) => {
    try {
      const user = req.user as any;
      if (!user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check if feed already exists
      const existingFeed = await prisma.staffCalendarFeed.findUnique({
        where: { customerId: user.id },
      });

      let feed;
      if (existingFeed) {
        // Regenerate token by updating the record (triggers new UUID)
        feed = await prisma.staffCalendarFeed.update({
          where: { customerId: user.id },
          data: { secureToken: crypto.randomUUID() },
        });
      } else {
        // Create new feed
        feed = await prisma.staffCalendarFeed.create({
          data: {
            customerId: user.id,
          },
        });
      }

      // Construct the feed URL
      const feedUrl = `${req.protocol}://${req.get("host")}/api/calendar/feed/${user.id}/${feed.secureToken}`;

      res.json({
        feedUrl,
        token: feed.secureToken,
        createdAt: feed.createdAt,
        updatedAt: feed.updatedAt,
      });
    } catch (error) {
      console.error("Error generating calendar feed:", error);
      res.status(500).json({ error: "Failed to generate calendar feed" });
    }
  }
);

// GET /api/staff/calendar-feed - Get current calendar feed info
router.get(
  "/calendar-feed",
  async (req: express.Request, res: express.Response) => {
    try {
      const user = req.user as any;
      if (!user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const feed = await prisma.staffCalendarFeed.findUnique({
        where: { customerId: user.id },
      });

      if (!feed) {
        return res.json({ exists: false });
      }

      const feedUrl = `${req.protocol}://${req.get("host")}/api/calendar/feed/${user.id}/${feed.secureToken}`;

      res.json({
        exists: true,
        feedUrl,
        token: feed.secureToken,
        isActive: feed.isActive,
        createdAt: feed.createdAt,
        updatedAt: feed.updatedAt,
      });
    } catch (error) {
      console.error("Error fetching calendar feed:", error);
      res.status(500).json({ error: "Failed to fetch calendar feed" });
    }
  }
);

export default router;
