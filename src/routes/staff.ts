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

      // For now, return all sessions in the date range
      // TODO: Filter by staff assignments once ClassSessionInstructor/ClassSessionAssistant models are added
      const sessions = await prisma.classSession.findMany({
        where: {
          sessionDate:
            Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        include: {
          class: {
            include: {
              category: true,
            },
          },
          classStep: true,
          schedulePattern: true,
        },
        orderBy: {
          sessionDate: "asc",
        },
      });

      // Transform sessions into calendar-friendly format
      const calendarEvents = sessions.map((session) => {
        const parentClass = session.class;
        const category = parentClass?.category;

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
            type: "instructor" as const, // TODO: Get from actual assignment
            name: "Instructor", // TODO: Get from actual role
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
