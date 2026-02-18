import { Request, Response, Router } from "express";
import { AuthenticatedRequest, isAuthenticated } from "../middleware/auth";
import prisma from "../prisma";
import * as OpenStudioService from "../services/OpenStudioService";

const router = Router();

// GET /api/open-studio/sessions - Upcoming Open Studio sessions
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    let studioId = (req as AuthenticatedRequest).studioId;

    if (!studioId) {
      const defaultStudio = await prisma.studio.findFirst({
        select: { id: true },
      });
      studioId = defaultStudio?.id;
    }

    if (!studioId) {
      return res.status(400).json({ error: "No studio available" });
    }

    const sessions = await OpenStudioService.getUpcomingSessions(studioId);
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching open studio sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// GET /api/open-studio/sessions/:id/availability - Available resources + time slots
router.get("/sessions/:id/availability", async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    const userId = (req as AuthenticatedRequest).user?.id;
    const availability = await OpenStudioService.getAvailability(sessionId, userId);
    res.json(availability);
  } catch (error: any) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: error.message || "Failed to fetch availability" });
  }
});

// POST /api/open-studio/bookings - Reserve a time block
router.post(
  "/bookings",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { subscriptionId, customerPunchPassId, sessionId, resourceId, startTime, endTime } =
        req.body;

      if ((!subscriptionId && !customerPunchPassId) || !sessionId || !resourceId || !startTime || !endTime) {
        return res.status(400).json({
          error: "Either subscriptionId or customerPunchPassId, plus sessionId, resourceId, startTime, and endTime are required",
        });
      }

      const booking = await OpenStudioService.createBooking(
        subscriptionId ? parseInt(subscriptionId) : undefined,
        customerPunchPassId ? parseInt(customerPunchPassId) : undefined,
        parseInt(sessionId),
        parseInt(resourceId),
        startTime,
        endTime
      );

      res.status(201).json(booking);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      res.status(400).json({ error: error.message || "Failed to create booking" });
    }
  }
);

// DELETE /api/open-studio/bookings/:id - Cancel booking
router.delete(
  "/bookings/:id",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await OpenStudioService.cancelBooking(bookingId);
      res.json(booking);
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      res.status(400).json({ error: error.message || "Failed to cancel booking" });
    }
  }
);

// POST /api/open-studio/bookings/:id/check-in - Check in
router.post(
  "/bookings/:id/check-in",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await OpenStudioService.checkIn(bookingId);
      res.json(booking);
    } catch (error: any) {
      console.error("Error checking in:", error);
      res.status(400).json({ error: error.message || "Failed to check in" });
    }
  }
);

// GET /api/open-studio/my-bookings - Member's bookings
router.get(
  "/my-bookings",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const bookings = await OpenStudioService.getMyBookings(user.id);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  }
);

// POST /api/open-studio/waitlist - Join waitlist for a held slot
router.post(
  "/waitlist",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { subscriptionId, sessionId, resourceId, startTime, endTime } = req.body;

      if (!subscriptionId || !sessionId || !resourceId || !startTime || !endTime) {
        return res.status(400).json({
          error: "subscriptionId, sessionId, resourceId, startTime, and endTime are required",
        });
      }

      const entry = await OpenStudioService.joinWaitlist(
        parseInt(subscriptionId),
        parseInt(sessionId),
        parseInt(resourceId),
        startTime,
        endTime
      );

      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error joining waitlist:", error);
      res.status(400).json({ error: error.message || "Failed to join waitlist" });
    }
  }
);

// DELETE /api/open-studio/waitlist/:id - Leave waitlist
router.delete(
  "/waitlist/:id",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const waitlistId = parseInt(req.params.id);
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ error: "subscriptionId is required" });
      }

      const entry = await OpenStudioService.leaveWaitlist(
        waitlistId,
        parseInt(subscriptionId)
      );

      res.json(entry);
    } catch (error: any) {
      console.error("Error leaving waitlist:", error);
      res.status(400).json({ error: error.message || "Failed to leave waitlist" });
    }
  }
);

// GET /api/open-studio/my-waitlist - Member's active waitlist entries
router.get(
  "/my-waitlist",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const entries = await OpenStudioService.getMyWaitlistEntries(user.id);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching waitlist:", error);
      res.status(500).json({ error: "Failed to fetch waitlist entries" });
    }
  }
);

// POST /api/open-studio/walk-in - Admin creates walk-in booking for a member
router.post(
  "/walk-in",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId, sessionId, resourceId } = req.body;

      if (!subscriptionId || !sessionId || !resourceId) {
        return res.status(400).json({
          error: "subscriptionId, sessionId, and resourceId are required",
        });
      }

      const booking = await OpenStudioService.walkInCheckIn(
        parseInt(subscriptionId),
        parseInt(sessionId),
        parseInt(resourceId)
      );

      res.status(201).json(booking);
    } catch (error: any) {
      console.error("Error creating walk-in:", error);
      res.status(400).json({ error: error.message || "Failed to create walk-in booking" });
    }
  }
);

export default router;
