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
      if (!req.user?.id) {
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
              sessionInstructors: {
                some: {
                  customerId: req.user.id,
                },
              },
            },
            {
              sessionAssistants: {
                some: {
                  customerId: req.user.id,
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
          classStep: {
            include: {
              parentClass: {
                include: {
                  category: true,
                },
              },
            },
          },
          sessionInstructors: {
            where: {
              customerId: req.user.id,
            },
            include: {
              role: true,
            },
          },
          sessionAssistants: {
            where: {
              customerId: req.user.id,
            },
            include: {
              role: true,
            },
          },
          schedulePattern: true,
        },
        orderBy: {
          sessionDate: "asc",
        },
      });

      // Transform sessions into calendar-friendly format
      const calendarEvents = sessions.map((session) => {
        const parentClass = session.class || session.classStep?.parentClass;
        const category = parentClass?.category;

        // Determine user's role for this session
        const isInstructor = session.sessionInstructors.length > 0;
        const isAssistant = session.sessionAssistants.length > 0;
        const role = isInstructor
          ? session.sessionInstructors[0]?.role
          : session.sessionAssistants[0]?.role;

        // Calculate end time from duration
        const startTime = new Date(session.sessionDate);
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + Number(session.durationHours));

        return {
          id: session.id,
          title: session.classStep
            ? `${parentClass?.name} - ${session.classStep.stepTitle}`
            : parentClass?.name,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          location: session.location,
          maxStudents: session.maxStudents,
          currentEnrollment: session.currentEnrollment,
          isCancelled: session.isCancelled,
          category: {
            id: category?.id,
            name: category?.name,
            color: category?.color,
          },
          userRole: {
            type: isInstructor ? "instructor" : "assistant",
            name: role?.name,
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
