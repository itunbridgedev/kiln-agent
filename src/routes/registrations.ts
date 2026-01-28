import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Extend Request type to include custom properties
interface AuthenticatedRequest extends Request {
  studioId?: number;
  user?: {
    id: number;
    email: string;
    name: string;
    roles: string[];
  };
}

// GET /api/registrations/classes - Browse available classes (public/customer view)
router.get("/classes", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    if (!studioId) {
      return res.status(400).json({ error: "Studio context required" });
    }

    const { categoryId, skillLevel, classType } = req.query;

    const classes = await prisma.class.findMany({
      where: {
        studioId,
        isActive: true,
        ...(categoryId && { categoryId: parseInt(categoryId as string) }),
        ...(skillLevel && { skillLevel: skillLevel as string }),
        ...(classType && { classType: classType as string }),
      },
      include: {
        category: true,
        teachingRole: true,
        schedules: {
          where: {
            status: { in: ["open", "full"] }, // Show open and full (for waitlist)
            startDate: {
              gte: new Date(), // Only future schedules
            },
          },
          orderBy: {
            startDate: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json(classes);
  } catch (error: any) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/registrations/classes/:id - Get class details with available schedules
router.get("/classes/:id", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    if (!studioId) {
      return res.status(400).json({ error: "Studio context required" });
    }

    const classId = parseInt(req.params.id);

    const classDetails = await prisma.class.findUnique({
      where: {
        id: classId,
        studioId,
      },
      include: {
        category: true,
        teachingRole: true,
        schedules: {
          where: {
            startDate: {
              gte: new Date(),
            },
          },
          include: {
            sessions: {
              orderBy: {
                sessionDate: "asc",
              },
            },
            _count: {
              select: {
                enrollments: true,
                waitlistEntries: true,
              },
            },
          },
          orderBy: {
            startDate: "asc",
          },
        },
        steps: {
          where: {
            isActive: true,
          },
          orderBy: {
            stepNumber: "asc",
          },
        },
      },
    });

    if (!classDetails) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.json(classDetails);
  } catch (error: any) {
    console.error("Error fetching class details:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/registrations - Create a new registration
router.post("/", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    const customerId = (req as AuthenticatedRequest).user?.id;

    if (!studioId) {
      return res.status(400).json({ error: "Studio context required" });
    }

    if (!customerId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      classId,
      scheduleId,
      registrationType,
      sessionIds, // For SINGLE_SESSION or DROP_IN
      customerNotes,
    } = req.body;

    // Validate required fields
    if (!classId || !registrationType) {
      return res.status(400).json({
        error: "classId and registrationType are required",
      });
    }

    // Validate registration type requirements
    if (registrationType === "FULL_SCHEDULE" && !scheduleId) {
      return res.status(400).json({
        error: "scheduleId required for FULL_SCHEDULE registration",
      });
    }

    if (
      (registrationType === "SINGLE_SESSION" ||
        registrationType === "DROP_IN") &&
      (!sessionIds || sessionIds.length === 0)
    ) {
      return res.status(400).json({
        error: "sessionIds required for SINGLE_SESSION or DROP_IN registration",
      });
    }

    // Fetch class details to calculate price
    const classDetails = await prisma.class.findUnique({
      where: { id: classId, studioId },
      include: {
        schedules: {
          where: scheduleId ? { id: scheduleId } : undefined,
        },
      },
    });

    if (!classDetails) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Calculate amount based on registration type
    let amountPaid = classDetails.price;

    if (registrationType === "SINGLE_SESSION" && sessionIds) {
      // For single session, use prorated price or full price
      // This is simplified - you may want different pricing logic
      amountPaid = classDetails.price;
    }

    // Check availability
    let isWaitlisted = false;
    if (scheduleId) {
      const schedule = await prisma.classSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          _count: {
            select: { enrollments: true },
          },
        },
      });

      if (
        schedule &&
        schedule._count.enrollments >= classDetails.maxStudents
      ) {
        isWaitlisted = true;
      }
    }

    // Create registration
    const registration = await prisma.classRegistration.create({
      data: {
        studioId,
        customerId,
        classId,
        scheduleId: scheduleId || null,
        registrationType,
        registrationStatus: isWaitlisted ? "WAITLISTED" : "PENDING",
        amountPaid,
        paymentStatus: "PENDING",
        customerNotes: customerNotes || null,
        // Link to specific sessions if applicable
        sessions:
          sessionIds && sessionIds.length > 0
            ? {
                create: sessionIds.map((sessionId: number) => ({
                  sessionId,
                })),
              }
            : undefined,
      },
      include: {
        class: {
          include: {
            category: true,
          },
        },
        schedule: true,
        sessions: {
          include: {
            session: true,
          },
        },
      },
    });

    // If waitlisted, create waitlist entry
    if (isWaitlisted && scheduleId) {
      // Get next position in waitlist
      const maxPosition = await prisma.classWaitlist.findFirst({
        where: {
          scheduleId,
          removedAt: null,
        },
        orderBy: {
          position: "desc",
        },
        select: {
          position: true,
        },
      });

      await prisma.classWaitlist.create({
        data: {
          studioId,
          customerId,
          classId,
          scheduleId,
          position: (maxPosition?.position || 0) + 1,
          customerNotes: customerNotes || null,
        },
      });
    }

    res.status(201).json({
      registration,
      message: isWaitlisted
        ? "Added to waitlist - you'll be notified when space becomes available"
        : "Registration created - please complete payment",
    });
  } catch (error: any) {
    console.error("Error creating registration:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/registrations/my-registrations - Get current user's registrations
router.get("/my-registrations", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    const customerId = (req as AuthenticatedRequest).user?.id;

    if (!studioId) {
      return res.status(400).json({ error: "Studio context required" });
    }

    if (!customerId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const registrations = await prisma.classRegistration.findMany({
      where: {
        studioId,
        customerId,
      },
      include: {
        class: {
          include: {
            category: true,
          },
        },
        schedule: {
          include: {
            sessions: {
              orderBy: {
                sessionDate: "asc",
              },
            },
          },
        },
        sessions: {
          include: {
            session: true,
          },
        },
      },
      orderBy: {
        registeredAt: "desc",
      },
    });

    res.json(registrations);
  } catch (error: any) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/registrations/:id/cancel - Cancel a registration
router.put("/:id/cancel", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    const customerId = (req as AuthenticatedRequest).user?.id;
    const registrationId = parseInt(req.params.id);

    if (!studioId || !customerId) {
      return res.status(400).json({ error: "Studio context and authentication required" });
    }

    const { cancellationReason } = req.body;

    // Verify registration belongs to user
    const registration = await prisma.classRegistration.findUnique({
      where: {
        id: registrationId,
        studioId,
        customerId,
      },
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    if (registration.registrationStatus === "CANCELLED") {
      return res.status(400).json({ error: "Registration already cancelled" });
    }

    // Update registration status
    const updated = await prisma.classRegistration.update({
      where: { id: registrationId },
      data: {
        registrationStatus: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: cancellationReason || "Customer cancelled",
      },
    });

    // TODO: Handle refund logic based on cancellation policy

    res.json({
      registration: updated,
      message: "Registration cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling registration:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/registrations/waitlist - Join a waitlist
router.post("/waitlist", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    const customerId = (req as AuthenticatedRequest).user?.id;

    if (!studioId || !customerId) {
      return res.status(400).json({ error: "Studio context and authentication required" });
    }

    const { classId, scheduleId, sessionId, customerNotes } = req.body;

    if (!classId) {
      return res.status(400).json({ error: "classId is required" });
    }

    // Check if already on waitlist
    const existing = await prisma.classWaitlist.findFirst({
      where: {
        studioId,
        customerId,
        classId,
        scheduleId: scheduleId || null,
        sessionId: sessionId || null,
        removedAt: null,
      },
    });

    if (existing) {
      return res.status(400).json({ error: "Already on waitlist" });
    }

    // Get next position
    const maxPosition = await prisma.classWaitlist.findFirst({
      where: {
        studioId,
        classId,
        scheduleId: scheduleId || null,
        sessionId: sessionId || null,
        removedAt: null,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });

    const waitlistEntry = await prisma.classWaitlist.create({
      data: {
        studioId,
        customerId,
        classId,
        scheduleId: scheduleId || null,
        sessionId: sessionId || null,
        position: (maxPosition?.position || 0) + 1,
        customerNotes: customerNotes || null,
      },
      include: {
        class: {
          include: {
            category: true,
          },
        },
        schedule: true,
        session: true,
      },
    });

    res.status(201).json({
      waitlistEntry,
      message: `Added to waitlist at position ${waitlistEntry.position}`,
    });
  } catch (error: any) {
    console.error("Error joining waitlist:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/registrations/my-waitlist - Get current user's waitlist entries
router.get("/my-waitlist", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    const customerId = (req as AuthenticatedRequest).user?.id;

    if (!studioId || !customerId) {
      return res.status(400).json({ error: "Studio context and authentication required" });
    }

    const waitlistEntries = await prisma.classWaitlist.findMany({
      where: {
        studioId,
        customerId,
        removedAt: null,
      },
      include: {
        class: {
          include: {
            category: true,
          },
        },
        schedule: true,
        session: true,
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    res.json(waitlistEntries);
  } catch (error: any) {
    console.error("Error fetching waitlist entries:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/registrations/waitlist/:id - Remove from waitlist
router.delete("/waitlist/:id", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    const customerId = (req as AuthenticatedRequest).user?.id;
    const waitlistId = parseInt(req.params.id);

    if (!studioId || !customerId) {
      return res.status(400).json({ error: "Studio context and authentication required" });
    }

    const waitlistEntry = await prisma.classWaitlist.findUnique({
      where: {
        id: waitlistId,
        studioId,
        customerId,
      },
    });

    if (!waitlistEntry) {
      return res.status(404).json({ error: "Waitlist entry not found" });
    }

    await prisma.classWaitlist.update({
      where: { id: waitlistId },
      data: {
        removedAt: new Date(),
        removalReason: "Customer removed",
      },
    });

    res.json({ message: "Removed from waitlist" });
  } catch (error: any) {
    console.error("Error removing from waitlist:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
