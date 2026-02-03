import { PrismaClient } from "@prisma/client";
import express from "express";

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/calendar/feed/:userId/:token - Public iCal feed (no auth required)
router.get(
  "/feed/:userId/:token",
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId, token } = req.params;

      // Verify the feed exists and token is valid
      const feed = await prisma.staffCalendarFeed.findFirst({
        where: {
          customerId: parseInt(userId),
          secureToken: token,
          isActive: true,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!feed) {
        return res.status(404).send("Calendar feed not found or invalid");
      }

      // Fetch sessions for the next 90 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);

      const sessions = await prisma.classSession.findMany({
        where: {
          sessionDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            {
              instructors: {
                some: {
                  customerId: feed.customerId,
                },
              },
            },
            {
              assistants: {
                some: {
                  customerId: feed.customerId,
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
          instructors: {
            where: {
              customerId: feed.customerId,
            },
            include: {
              role: true,
            },
          },
          assistants: {
            where: {
              customerId: feed.customerId,
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

      // Generate iCal format
      const icsEvents = sessions.map((session: typeof sessions[0]) => {
        const sessionDate = new Date(session.sessionDate);
        const [startHours, startMinutes] = session.startTime
          .split(":")
          .map(Number);
        const [endHours, endMinutes] = session.endTime.split(":").map(Number);

        const startTime = new Date(sessionDate);
        startTime.setHours(startHours, startMinutes, 0, 0);

        const endTime = new Date(sessionDate);
        endTime.setHours(endHours, endMinutes, 0, 0);

        // Determine role
        const isInstructor = session.instructors.length > 0;
        const roleLabel = isInstructor ? "Instructor" : "Assistant";

        // Format title
        const title = session.classStep
          ? `${session.class?.name} - ${session.classStep.name} (${roleLabel})`
          : `${session.class?.name} (${roleLabel})`;

        // Format description
        const description = [
          session.topic ? `Topic: ${session.topic}` : "",
          `Role: ${roleLabel}`,
          `Enrollment: ${session.currentEnrollment}/${session.maxStudents}`,
          session.isCancelled ? "STATUS: CANCELLED" : "",
        ]
          .filter(Boolean)
          .join("\\n");

        // Format dates to iCal format (YYYYMMDDTHHMMSS)
        const formatICalDate = (date: Date) => {
          return date
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d{3}Z/, "Z");
        };

        return [
          "BEGIN:VEVENT",
          `UID:session-${session.id}@kilnagent.com`,
          `DTSTAMP:${formatICalDate(new Date())}`,
          `DTSTART:${formatICalDate(startTime)}`,
          `DTEND:${formatICalDate(endTime)}`,
          `SUMMARY:${title}`,
          `DESCRIPTION:${description}`,
          session.location ? `LOCATION:${session.location}` : "",
          session.isCancelled ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
          "END:VEVENT",
        ]
          .filter(Boolean)
          .join("\r\n");
      });

      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Kiln Agent//Staff Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${feed.customer.name} - Teaching Schedule`,
        "X-WR-TIMEZONE:America/Denver",
        "X-WR-CALDESC:Your teaching schedule from Kiln Agent",
        ...icsEvents,
        "END:VCALENDAR",
      ].join("\r\n");

      // Set appropriate headers for iCal
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="teaching-schedule.ics"'
      );
      res.send(icsContent);
    } catch (error) {
      console.error("Error generating calendar feed:", error);
      res.status(500).send("Error generating calendar feed");
    }
  }
);

export default router;
