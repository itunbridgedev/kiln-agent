import { PrismaClient } from "@prisma/client";
import { Request, Response, Router } from "express";
import { isAuthenticated, AuthenticatedRequest } from "../middleware/auth";
import prisma from "../prisma";
import { checkInService } from "../services/CheckInService";

const router = Router();

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

    // For multi-step classes that require sequence, determine which sessions to show
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Start of today in UTC (to match sessionDate which is stored in UTC)
    
    let sessionWhereClause: any = {
      studioId,
      classId,
      sessionDate: {
        gte: today,
      },
      isCancelled: false,
    };

    // If this is a multi-step class that requires sequential completion,
    // only show sessions from the first step that are from "starting point" patterns
    if (classDetails.classType === 'multi-step' && classDetails.requiresSequence) {
      // Get the first step
      const firstStep = await prisma.classStep.findFirst({
        where: {
          classId,
          stepNumber: 1
        },
        select: {
          id: true
        }
      });

      if (firstStep) {
        // Get patterns for this step and filter to "starting point" patterns
        // Starting points are patterns with BYSETPOS containing 1, 2, 7, or 8
        // (first week and makeup week occurrences)
        const patterns = await prisma.classSchedulePattern.findMany({
          where: {
            classId,
            classStepId: firstStep.id,
            recurrenceRule: {
              contains: 'BYSETPOS'
            }
          }
        });

        // Filter to patterns with BYSETPOS containing 1, 2, 7, or 8
        const startingPatternIds = patterns
          .filter(p => {
            const match = p.recurrenceRule.match(/BYSETPOS=([^;]+)/);
            if (!match) return false;
            const positions = match[1].split(',').map(n => parseInt(n.trim()));
            // Include patterns with 1, 2, 7, or 8 (first week and makeup week)
            return positions.some(pos => [1, 2, 7, 8].includes(pos));
          })
          .map(p => p.id);

        if (startingPatternIds.length > 0) {
          sessionWhereClause.classStepId = firstStep.id;
          sessionWhereClause.schedulePatternId = { in: startingPatternIds };
        } else {
          // No BYSETPOS patterns, so just filter to step 1
          sessionWhereClause.classStepId = firstStep.id;
        }
      }
    }

    // Fetch upcoming sessions
    const sessions = await prisma.classSession.findMany({
      where: sessionWhereClause,
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
          registrationStatus: { in: ["CONFIRMED", "PENDING"] }, // Include both CONFIRMED and PENDING
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
  } catch (error: any) {
    console.error("Error checking resource availability:", error.message);
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

    // For multi-session registrations (FULL_SCHEDULE, DROP_IN), session ID indicates
    // which session the user clicked to register from - we'll create initial booking for it
    if (!sessionId) {
      return res.status(400).json({
        error: "sessionId is required to create initial booking",
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
      async (tx) => {
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
          reservations: {
            where: {
              reservationStatus: {
                in: ["PENDING", "CHECKED_IN"],
              },
            },
            include: {
              session: {
                include: {
                  classStep: true,
                },
              },
            },
            orderBy: {
              session: { sessionDate: "asc" },
            },
          },
        },
        orderBy: {
          registeredAt: "desc",
        },
      });

      // Combine initial bookings + flexible reservations into a unified allSessions list
      // Deduplicate by sessionId (a session can appear in both RegistrationSession and SessionReservation)
      const normalized = registrations.map(reg => {
        const sessionMap = new Map<number, any>();

        // Add initial bookings
        for (const s of reg.sessions) {
          sessionMap.set(s.session.id, {
            sessionId: s.session.id,
            sessionDate: s.session.sessionDate.toISOString().split('T')[0],
            startTime: s.session.startTime,
            endTime: s.session.endTime,
            classStep: s.session.classStep,
            attended: s.attended,
            source: 'initial' as const,
          });
        }

        // Add flexible reservations (overwrite initial if same session, since flexible has richer status)
        for (const r of reg.reservations) {
          sessionMap.set(r.session.id, {
            sessionId: r.session.id,
            sessionDate: r.session.sessionDate.toISOString().split('T')[0],
            startTime: r.session.startTime,
            endTime: r.session.endTime,
            classStep: r.session.classStep,
            status: r.reservationStatus,
            source: 'flexible' as const,
          });
        }

        // Sort by date, then time
        const allSessions = Array.from(sessionMap.values()).sort((a, b) => {
          const dateCompare = a.sessionDate.localeCompare(b.sessionDate);
          if (dateCompare !== 0) return dateCompare;
          return a.startTime.localeCompare(b.startTime);
        });

        return {
          ...reg,
          sessions: reg.sessions.map(s => ({
            ...s,
            session: {
              ...s.session,
              sessionDate: s.session.sessionDate.toISOString().split('T')[0],
            },
          })),
          allSessions,
        };
      });

      res.json(normalized);
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

// GET /api/registrations/:id/calendar - Get calendar view of reservations
router.get("/:id/calendar", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const registrationId = parseInt(req.params.id);
    const customerId = (req as AuthenticatedRequest).user?.id;
    
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify registration belongs to customer
    const registration = await prisma.classRegistration.findUnique({
      where: { id: registrationId },
      select: {
        customerId: true,
        passType: true,
        sessionsIncluded: true,
        sessionsRemaining: true,
        sessionsAttended: true,
        maxAdvanceReservations: true,
        validFrom: true,
        validUntil: true,
        class: {
          select: {
            id: true,
            name: true,
            classType: true
          }
        }
      }
    });

    if (!registration || registration.customerId !== customerId) {
      return res.status(403).json({ 
        error: "You can only view your own registration calendar" 
      });
    }

    // Count current reservations from both sources
    const flexibleReservationCount = await prisma.sessionReservation.count({
      where: {
        registrationId,
        reservationStatus: {
          in: ["PENDING", "CHECKED_IN"]
        }
      }
    });

    const initialBookingCount = await prisma.registrationSession.count({
      where: {
        registrationId
      }
    });

    const currentReservations = flexibleReservationCount + initialBookingCount;

    // Get flexible reservations
    const flexibleReservations = await prisma.sessionReservation.findMany({
      where: { registrationId },
      include: {
        session: {
          include: {
            class: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Get initial booking sessions
    const initialBookings = await prisma.registrationSession.findMany({
      where: { registrationId },
      include: {
        session: {
          include: {
            class: {
              select: {
                name: true
              }
            },
            classStep: true
          }
        }
      }
    });

    // Combine both types into a unified format
    const reservations = [
      ...flexibleReservations.map(r => ({
        id: r.id,
        registrationId: r.registrationId,
        sessionId: r.sessionId,
        reservationStatus: r.reservationStatus,
        reservedAt: r.reservedAt,
        checkedInAt: r.checkedInAt,
        attendedAt: r.attendedAt,
        noShowDetectedAt: r.noShowDetectedAt,
        cancelledAt: r.cancelledAt,
        cancellationReason: r.cancellationReason,
        punchUsed: r.punchUsed,
        customerNotes: r.customerNotes,
        session: r.session,
        source: 'flexible' as const
      })),
      ...initialBookings.map(ib => ({
        id: ib.id,
        registrationId: ib.registrationId,
        sessionId: ib.sessionId,
        reservationStatus: 'PENDING' as const,
        reservedAt: registration.validFrom || new Date(),
        checkedInAt: null,
        attendedAt: null,
        noShowDetectedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        punchUsed: false,
        customerNotes: null,
        session: ib.session,
        source: 'initial' as const
      }))
    ].sort((a, b) => 
      new Date(b.session.sessionDate).getTime() - new Date(a.session.sessionDate).getTime()
    );

    const formatted = reservations.map((r) => {
      // Calculate check-in window for each reservation
      const checkInWindow = checkInService.getCheckInWindow(
        r.session.sessionDate,
        r.session.startTime,
        false // customer check-in
      );

      return {
        id: r.id,
        source: r.source,
        status: r.reservationStatus,
        reservedAt: r.reservedAt,
        checkedInAt: r.checkedInAt,
        attendedAt: r.attendedAt,
        noShowDetectedAt: r.noShowDetectedAt,
        cancelledAt: r.cancelledAt,
        cancellationReason: r.cancellationReason,
        punchUsed: r.punchUsed,
        customerNotes: r.customerNotes,
        session: {
          id: r.session.id,
          date: r.session.sessionDate.toISOString().split('T')[0],
          startTime: r.session.startTime,
          endTime: r.session.endTime,
          topic: r.session.topic,
          className: r.session.class?.name || ''
        },
        checkInWindow: {
          start: checkInWindow.windowStart.toISOString(),
          end: checkInWindow.windowEnd.toISOString(),
          canCheckIn: checkInWindow.canCheckIn
        }
      };
    });

    // For multi-step classes, max reservations should be the number of steps
    let maxReservations = registration.maxAdvanceReservations;
    if (registration.class.classType === 'multi-step') {
      const stepCount = await prisma.classStep.count({
        where: { classId: registration.class.id, isActive: true }
      });
      maxReservations = stepCount;
    }

    res.json({
      registration: {
        id: registrationId,
        class: {
          id: registration.class.id,
          name: registration.class.name,
          classType: registration.class.classType
        },
        passType: registration.passType,
        sessionsIncluded: registration.sessionsIncluded,
        sessionsRemaining: registration.sessionsRemaining,
        sessionsAttended: registration.sessionsAttended,
        currentReservations,
        maxReservations: maxReservations,
        canReserveMore: currentReservations < maxReservations,
        validFrom: registration.validFrom,
        validUntil: registration.validUntil
      },
      reservations: formatted
    });
  } catch (error) {
    console.error("Error fetching registration calendar:", error);
    const message = error instanceof Error ? error.message : 'Failed to fetch registration calendar';
    res.status(500).json({ error: message });
  }
});

export default router;
