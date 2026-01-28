import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { isAuthenticated } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Get all studio sessions for admin calendar view
router.get("/sessions", isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate, staffId, categoryId, roleType } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "startDate and endDate are required" });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Build filter conditions
    const whereConditions: any = {
      sessionDate: {
        gte: start,
        lte: end,
      },
    };

    // Filter by category if provided
    if (categoryId) {
      whereConditions.class = {
        categoryId: parseInt(categoryId as string),
      };
    }

    // Fetch all sessions with staff assignments
    const sessions = await prisma.classSession.findMany({
      where: whereConditions,
      include: {
        class: {
          include: {
            category: true,
          },
        },
        instructors: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            role: true,
          },
        },
        assistants: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            role: true,
          },
        },
      },
      orderBy: {
        sessionDate: "asc",
      },
    });

    // Apply staff filter (post-query since it's across multiple relations)
    let filteredSessions = sessions;
    if (staffId) {
      const targetStaffId = parseInt(staffId as string);
      filteredSessions = sessions.filter(
        (session) =>
          session.instructors.some((i) => i.customer.id === targetStaffId) ||
          session.assistants.some((a) => a.customer.id === targetStaffId)
      );
    }

    // Apply role type filter
    if (roleType) {
      filteredSessions = filteredSessions.filter((session) => {
        if (roleType === "instructor") {
          return session.instructors.length > 0;
        } else if (roleType === "assistant") {
          return session.assistants.length > 0;
        }
        return true;
      });
    }

    // Transform to calendar event format
    const calendarEvents = filteredSessions.map((session) => {
      const allStaff = [
        ...session.instructors.map((i) => ({
          ...i.customer,
          roleType: "instructor" as const,
          roleName: i.role?.name || "Instructor",
        })),
        ...session.assistants.map((a) => ({
          ...a.customer,
          roleType: "assistant" as const,
          roleName: a.role?.name || "Assistant",
        })),
      ];

      // Build start and end datetime from sessionDate + startTime/endTime
      // Extract just the date components to avoid timezone issues
      const sessionDateObj = new Date(session.sessionDate);
      const year = sessionDateObj.getUTCFullYear();
      const month = sessionDateObj.getUTCMonth();
      const day = sessionDateObj.getUTCDate();

      const [startHour, startMin] = session.startTime.split(":").map(Number);
      const [endHour, endMin] = session.endTime.split(":").map(Number);

      // Create ISO strings without timezone conversion
      const pad = (n: number) => String(n).padStart(2, "0");
      const startDateTime = `${year}-${pad(month + 1)}-${pad(day)}T${pad(startHour)}:${pad(startMin)}:00`;
      const endDateTime = `${year}-${pad(month + 1)}-${pad(day)}T${pad(endHour)}:${pad(endMin)}:00`;

      return {
        id: session.id,
        title: session.class.name,
        start: startDateTime,
        end: endDateTime,
        classId: session.classId,
        className: session.class.name,
        categoryName: session.class.category.name,
        categoryId: session.class.category.id,
        maxStudents: session.maxStudents || 0,
        currentEnrollment: session.currentEnrollment,
        isFull: session.maxStudents
          ? session.currentEnrollment >= session.maxStudents
          : false,
        staff: allStaff,
        instructorCount: session.instructors.length,
        assistantCount: session.assistants.length,
        hasConflict: false, // Will be computed client-side
      };
    });

    res.json(calendarEvents);
  } catch (error) {
    console.error("Error fetching admin sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Get all staff members for filtering
router.get("/staff", isAuthenticated, async (req, res) => {
  try {
    // Get customers who have teaching roles or are instructors/assistants in sessions
    const staff = await prisma.customer.findMany({
      where: {
        OR: [
          {
            roles: {
              some: {
                role: {
                  name: {
                    in: ["staff", "manager", "admin"],
                  },
                },
              },
            },
          },
          {
            staffTeachingRoles: {
              some: {},
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        roles: {
          include: {
            role: true,
          },
        },
        staffTeachingRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json(staff);
  } catch (error) {
    console.error("Error fetching staff list:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// Assign staff to a session
router.post("/sessions/:id/staff", isAuthenticated, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { customerId, roleType, roleId } = req.body;

    if (!customerId || !roleType) {
      return res
        .status(400)
        .json({ error: "customerId and roleType are required" });
    }

    if (roleType !== "instructor" && roleType !== "assistant") {
      return res
        .status(400)
        .json({ error: "roleType must be 'instructor' or 'assistant'" });
    }

    // Check if session exists
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Check for conflicts - staff already assigned to another session at the same time
    const overlappingSessions = await prisma.classSession.findMany({
      where: {
        id: { not: sessionId },
        sessionDate: session.sessionDate,
        isCancelled: false,
        OR: [
          {
            instructors: {
              some: {
                customerId: customerId,
              },
            },
          },
          {
            assistants: {
              some: {
                customerId: customerId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        class: {
          select: {
            name: true,
          },
        },
      },
    });

    // Check if times overlap
    const hasConflict = overlappingSessions.some((otherSession) => {
      const sessionStart = session.startTime;
      const sessionEnd = session.endTime;
      const otherStart = otherSession.startTime;
      const otherEnd = otherSession.endTime;

      // Times overlap if: (start1 < end2) AND (end1 > start2)
      return sessionStart < otherEnd && sessionEnd > otherStart;
    });

    if (hasConflict) {
      return res.status(409).json({
        error: "Staff member has a conflicting session at this time",
        conflicts: overlappingSessions,
      });
    }

    // Create assignment based on roleType
    let assignment;
    if (roleType === "instructor") {
      assignment = await prisma.classSessionInstructor.create({
        data: {
          sessionId,
          customerId,
          roleId: roleId || null,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } else {
      assignment = await prisma.classSessionAssistant.create({
        data: {
          sessionId,
          customerId,
          roleId: roleId || null,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    res.json(assignment);
  } catch (error: any) {
    console.error("Error assigning staff to session:", error);

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "Staff member is already assigned to this session" });
    }

    res.status(500).json({ error: "Failed to assign staff" });
  }
});

// Remove staff assignment from a session
router.delete(
  "/sessions/:id/staff/:customerId/:roleType",
  isAuthenticated,
  async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const customerId = parseInt(req.params.customerId);
      const roleType = req.params.roleType;

      if (roleType !== "instructor" && roleType !== "assistant") {
        return res
          .status(400)
          .json({ error: "roleType must be 'instructor' or 'assistant'" });
      }

      // Delete based on roleType
      if (roleType === "instructor") {
        await prisma.classSessionInstructor.deleteMany({
          where: {
            sessionId,
            customerId,
          },
        });
      } else {
        await prisma.classSessionAssistant.deleteMany({
          where: {
            sessionId,
            customerId,
          },
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing staff assignment:", error);
      res.status(500).json({ error: "Failed to remove staff assignment" });
    }
  }
);

// Get staff assignments for a session
router.get("/sessions/:id/staff", isAuthenticated, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);

    const [instructors, assistants] = await Promise.all([
      prisma.classSessionInstructor.findMany({
        where: { sessionId },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.classSessionAssistant.findMany({
        where: { sessionId },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    res.json({
      instructors,
      assistants,
    });
  } catch (error) {
    console.error("Error fetching session staff:", error);
    res.status(500).json({ error: "Failed to fetch session staff" });
  }
});

export default router;
