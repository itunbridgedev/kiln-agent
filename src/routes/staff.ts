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
        dateFilter.lte = new Date(endDate as string);
      }

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
      const calendarEvents = sessions.map((session) => {
        const parentClass = session.class;
        const category = parentClass?.category;

        // Determine user's role for this session
        const isInstructor = session.instructors.length > 0;
        const isAssistant = session.assistants.length > 0;
        const role = isInstructor
          ? session.instructors[0]?.role
          : session.assistants[0]?.role;

        // Calculate end time from start/end time strings
        const sessionDate = new Date(session.sessionDate);
        const [startHours, startMinutes] = session.startTime
          .split(":")
          .map(Number);
        const [endHours, endMinutes] = session.endTime.split(":").map(Number);

        const startTime = new Date(sessionDate);
        startTime.setHours(startHours, startMinutes, 0, 0);

        const endTime = new Date(sessionDate);
        endTime.setHours(endHours, endMinutes, 0, 0);

        return {
          id: session.id,
          title: session.classStep
            ? `${parentClass?.name} - ${session.classStep.name}`
            : parentClass?.name,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
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
            type: isInstructor ? ("instructor" as const) : ("assistant" as const),
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

      res.json(calendarEvents);
    } catch (error) {
      console.error("Error fetching staff sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }
);

export default router;
