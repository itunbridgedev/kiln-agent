import { Request, Response, Router } from "express";
import { isAuthenticated } from "../middleware/auth";
import prisma from "../prisma";

const router = Router();

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
    // Try to get studioId from tenant middleware, authenticated user, or default to first studio
    let studioId = (req as AuthenticatedRequest).studioId;

    if (!studioId && (req as AuthenticatedRequest).user) {
      // If user is authenticated, get their studioId
      const user = await prisma.customer.findUnique({
        where: { id: (req as AuthenticatedRequest).user!.id },
        select: { studioId: true },
      });
      studioId = user?.studioId;
    }

    if (!studioId) {
      // Default to first studio (for development without subdomain)
      const defaultStudio = await prisma.studio.findFirst({
        select: { id: true },
      });
      studioId = defaultStudio?.id;
    }

    if (!studioId) {
      return res.status(400).json({ error: "No studio available" });
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

// GET /api/registrations/classes/:id - Get class details with available sessions
router.get("/classes/:id", async (req: Request, res: Response) => {
  try {
    // Try to get studioId from tenant middleware, authenticated user, or default to first studio
    let studioId = (req as AuthenticatedRequest).studioId;

    if (!studioId && (req as AuthenticatedRequest).user) {
      // If user is authenticated, get their studioId
      const user = await prisma.customer.findUnique({
        where: { id: (req as AuthenticatedRequest).user!.id },
        select: { studioId: true },
      });
      studioId = user?.studioId;
    }

    if (!studioId) {
      // Default to first studio (for development without subdomain)
      const defaultStudio = await prisma.studio.findFirst({
        select: { id: true },
      });
      studioId = defaultStudio?.id;
    }

    if (!studioId) {
      return res.status(400).json({ error: "No studio available" });
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
        resourceRequirements: {
          include: {
            resource: true,
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

    // Fetch upcoming sessions separately
    const sessions = await prisma.classSession.findMany({
      where: {
        studioId,
        classId,
        sessionDate: {
          gte: new Date(),
        },
        isCancelled: false,
      },
      include: {
        classStep: true,
        schedulePattern: {
          select: {
            id: true,
            recurrenceRule: true,
          },
        },
        registrationSessions: {
          include: {
            registration: true,
          },
        },
      },
      orderBy: {
        sessionDate: "asc",
      },
      take: 50, // Limit to next 50 sessions
    });

    // Add enrollment count to each session (count only confirmed registrations)
    const sessionsWithEnrollment = sessions.map(
      (session: (typeof sessions)[0]) => {
        const activeRegistrations = session.registrationSessions.filter(
          (rs: (typeof session.registrationSessions)[0]) =>
            rs.registration.registrationStatus === "CONFIRMED"
        );

        return {
          ...session,
          currentEnrollment: activeRegistrations.length,
          availableSpots:
            (session.maxStudents || classDetails.maxStudents) -
            activeRegistrations.length,
        };
      }
    );

    // Return class details with sessions
    const response = {
      ...classDetails,
      sessions: sessionsWithEnrollment,
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error fetching class details:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/registrations/resource-availability - Check resource availability for a session (public)
router.get("/resource-availability", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    const session = await prisma.classSession.findUnique({
      where: { id: parseInt(sessionId as string) },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get all resources for this studio
    const resources = await prisma.studioResource.findMany({
      where: { studioId: session.studioId },
    });

    // Find all overlapping sessions
    const overlappingSessions = await prisma.classSession.findMany({
      where: {
        studioId: session.studioId,
        sessionDate: session.sessionDate,
        isCancelled: false,
        OR: [
          {
            AND: [
              { startTime: { lte: session.startTime } },
              { endTime: { gt: session.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: session.endTime } },
              { endTime: { gte: session.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: session.startTime } },
              { endTime: { lte: session.endTime } },
            ],
          },
        ],
      },
      select: { id: true },
    });

    const sessionIds = overlappingSessions.map((s: { id: number }) => s.id);

    // Get all allocations for these sessions
    const allocations = await prisma.sessionResourceAllocation.findMany({
      where: {
        sessionId: { in: sessionIds },
        registration: {
          registrationStatus: "CONFIRMED",
        },
      },
      select: { resourceId: true, quantity: true },
    });

    // Calculate availability for each resource
    const availability = resources.map((resource: (typeof resources)[0]) => {
      const allocated = allocations
        .filter((a: (typeof allocations)[0]) => a.resourceId === resource.id)
        .reduce(
          (sum: number, a: (typeof allocations)[0]) => sum + a.quantity,
          0
        );

      return {
        resourceId: resource.id,
        resourceName: resource.name,
        totalQuantity: resource.quantity,
        allocated,
        available: resource.quantity - allocated,
      };
    });

    res.json(availability);
  } catch (error) {
    console.error("Error checking resource availability:", error);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

// POST /api/registrations - Create a new registration (supports guest bookings)
router.post("/", async (req: Request, res: Response) => {
  try {
    let studioId = (req as AuthenticatedRequest).studioId;
    const customerId = (req as AuthenticatedRequest).user?.id;

    const {
      classId,
      sessionId, // Single session booking
      registrationType,
      guestCount = 1,
      amountPaid,
      customerNotes,
      guestName,
      guestEmail,
      guestPhone,
    } = req.body;

    // Require either authentication or guest info
    const isGuestBooking = !customerId && guestEmail;
    if (!customerId && !isGuestBooking) {
      return res.status(401).json({
        error: "Authentication or guest information (name and email) required",
      });
    }

    // Validate required fields
    if (!classId || !registrationType) {
      return res.status(400).json({
        error: "classId and registrationType are required",
      });
    }

    // For single session booking, sessionId is required
    if (registrationType === "SINGLE_SESSION" && !sessionId) {
      return res.status(400).json({
        error: "sessionId required for SINGLE_SESSION registration",
      });
    }

    // Validate guest info if guest booking
    if (isGuestBooking && !guestName) {
      return res.status(400).json({
        error: "Guest name and email are required for guest bookings",
      });
    }

    // Get studioId from the session if not from tenant middleware
    if (!studioId && sessionId) {
      const session = await prisma.classSession.findUnique({
        where: { id: sessionId },
        select: { studioId: true },
      });
      studioId = session?.studioId;
    }

    // Get studioId from the class if still not found
    if (!studioId && classId) {
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        select: { studioId: true },
      });
      studioId = classInfo?.studioId;
    }

    if (!studioId) {
      return res.status(400).json({ error: "Studio context required" });
    }

    // Fetch class details
    const classDetails = await prisma.class.findUnique({
      where: { id: classId, studioId },
      include: {
        resourceRequirements: {
          include: {
            resource: true,
          },
        },
      },
    });

    if (!classDetails) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Fetch session details
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        class: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Check if session has enough spots
    const availableSpots =
      (session.maxStudents || classDetails.maxStudents) -
      session.currentEnrollment;

    if (guestCount > availableSpots) {
      return res.status(409).json({
        error: `Insufficient spots. Only ${availableSpots} spots available.`,
      });
    }

    // Find overlapping sessions to check resource conflicts
    const overlappingSessions = await prisma.classSession.findMany({
      where: {
        sessionDate: session.sessionDate,
        isCancelled: false,
        OR: [
          {
            AND: [
              { startTime: { lte: session.startTime } },
              { endTime: { gt: session.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: session.endTime } },
              { endTime: { gte: session.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: session.startTime } },
              { endTime: { lte: session.endTime } },
            ],
          },
        ],
      },
      select: { id: true },
    });

    const sessionIds = overlappingSessions.map((s: { id: number }) => s.id);

    // Check resource availability
    for (const requirement of classDetails.resourceRequirements) {
      const allocations = await prisma.sessionResourceAllocation.findMany({
        where: {
          resourceId: requirement.resourceId,
          sessionId: { in: sessionIds },
          registration: {
            registrationStatus: "CONFIRMED",
          },
        },
        select: { quantity: true },
      });

      const totalAllocated = allocations.reduce(
        (sum: number, a: (typeof allocations)[0]) => sum + a.quantity,
        0
      );
      const available = requirement.resource.quantity - totalAllocated;
      const needed = guestCount * requirement.quantityPerStudent;

      if (needed > available) {
        return res.status(409).json({
          error: `Insufficient ${requirement.resource.name}. Need ${needed}, only ${available} available.`,
        });
      }
    }

    // Create registration with resource allocation in a transaction
    const registration = await prisma.$transaction(
      async (
        tx: Omit<
          PrismaClient,
          | "$connect"
          | "$disconnect"
          | "$on"
          | "$transaction"
          | "$use"
          | "$extends"
        >
      ) => {
        // Create the registration
        const newRegistration = await tx.classRegistration.create({
          data: {
            studioId,
            customerId: customerId || null,
            classId,
            scheduleId: null,
            registrationType,
            registrationStatus: "CONFIRMED",
            amountPaid:
              amountPaid ||
              parseFloat(classDetails.price.toString()) * guestCount,
            paymentStatus: "PENDING",
            customerNotes: customerNotes || null,
            guestName: guestName || null,
            guestEmail: guestEmail || null,
            guestPhone: guestPhone || null,
            sessions: {
              create: {
                sessionId,
              },
            },
          },
          include: {
            class: {
              include: {
                category: true,
              },
            },
            sessions: {
              include: {
                session: true,
              },
            },
          },
        });

        // Allocate resources
        for (const requirement of classDetails.resourceRequirements) {
          await tx.sessionResourceAllocation.create({
            data: {
              sessionId,
              resourceId: requirement.resourceId,
              registrationId: newRegistration.id,
              quantity: guestCount * requirement.quantityPerStudent,
            },
          });
        }

        // Increment session enrollment
        await tx.classSession.update({
          where: { id: sessionId },
          data: {
            currentEnrollment: {
              increment: guestCount,
            },
          },
        });

        return newRegistration;
      }
    );

    res.status(201).json({
      registration,
      message: "Registration confirmed!",
    });
  } catch (error: any) {
    console.error("Error creating registration:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/registrations/my-registrations - Get current customer's registrations (requires authentication)
router.get(
  "/my-registrations",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      let studioId = (req as AuthenticatedRequest).studioId;
      const customerId = (req as AuthenticatedRequest).user?.id;

      if (!customerId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get studioId from customer if not from tenant middleware
      if (!studioId) {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          select: { studioId: true },
        });
        studioId = customer?.studioId;
      }

      // Fall back to any studio the customer has registrations in
      if (!studioId) {
        const anyRegistration = await prisma.classRegistration.findFirst({
          where: { customerId },
          select: { studioId: true },
        });
        studioId = anyRegistration?.studioId;
      }

      const registrations = await prisma.classRegistration.findMany({
        where: {
          customerId,
          ...(studioId ? { studioId } : {}),
        },
        include: {
          class: {
            include: {
              category: true,
            },
          },
          sessions: {
            include: {
              session: {
                include: {
                  classStep: true,
                },
              },
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
  }
);

// PUT /api/registrations/:id/cancel - Cancel a registration (requires authentication)
router.put(
  "/:id/cancel",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      let studioId = (req as AuthenticatedRequest).studioId;
      const customerId = (req as AuthenticatedRequest).user?.id;
      const registrationId = parseInt(req.params.id);

      if (!customerId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get studioId from customer if not from tenant middleware
      if (!studioId) {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          select: { studioId: true },
        });

        if (!customer) {
          return res.status(404).json({ error: "Customer not found" });
        }

        studioId = customer.studioId;
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
        return res
          .status(400)
          .json({ error: "Registration already cancelled" });
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
  }
);

// POST /api/registrations/waitlist - Join a waitlist (requires authentication)
router.post(
  "/waitlist",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const studioId = (req as AuthenticatedRequest).studioId;
      const customerId = (req as AuthenticatedRequest).user?.id;

      if (!studioId || !customerId) {
        return res
          .status(400)
          .json({ error: "Studio context and authentication required" });
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
  }
);

// GET /api/registrations/my-waitlist - Get current customer's waitlist entries (requires authentication)
router.get(
  "/my-waitlist",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      let studioId = (req as AuthenticatedRequest).studioId;
      const customerId = (req as AuthenticatedRequest).user?.id;

      if (!customerId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get studioId from customer if not from tenant middleware
      if (!studioId) {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          select: { studioId: true },
        });
        studioId = customer?.studioId;
      }

      const waitlistEntries = await prisma.classWaitlist.findMany({
        where: {
          customerId,
          removedAt: null,
          ...(studioId ? { studioId } : {}),
        },
        include: {
          class: {
            include: {
              category: true,
            },
          },
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
  }
);

// DELETE /api/registrations/waitlist/:id - Remove from waitlist (requires authentication)
router.delete(
  "/waitlist/:id",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const studioId = (req as AuthenticatedRequest).studioId;
      const customerId = (req as AuthenticatedRequest).user?.id;
      const waitlistId = parseInt(req.params.id);

      if (!studioId || !customerId) {
        return res
          .status(400)
          .json({ error: "Studio context and authentication required" });
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
  }
);

// GET /api/registrations/:id - Get a specific registration (supports both authenticated and guest users)
// NOTE: This route must be defined LAST to avoid conflicting with specific routes like /my-registrations
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthenticatedRequest).user?.id;
    const registrationId = parseInt(req.params.id);

    const registration = await prisma.classRegistration.findFirst({
      where: {
        id: registrationId,
        // If authenticated, verify ownership; if not, allow guest bookings
        ...(customerId ? { customerId } : {}),
      },
      include: {
        class: {
          include: {
            category: true,
          },
        },
        sessions: {
          include: {
            session: {
              include: {
                classStep: true,
              },
            },
          },
        },
      },
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json(registration);
  } catch (error: any) {
    console.error("Error fetching registration:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
