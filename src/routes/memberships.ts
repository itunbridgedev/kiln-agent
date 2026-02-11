import { Request, Response, Router } from "express";
import { AuthenticatedRequest, isAuthenticated } from "../middleware/auth";
import prisma from "../prisma";
import * as MembershipService from "../services/MembershipService";

const router = Router();

// GET /api/memberships - List available membership tiers (public)
router.get("/", async (req: Request, res: Response) => {
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

    const memberships = await MembershipService.getMemberships(studioId);
    res.json(memberships);
  } catch (error) {
    console.error("Error fetching memberships:", error);
    res.status(500).json({ error: "Failed to fetch memberships" });
  }
});

// GET /api/memberships/my-subscription - Get current user's subscription
router.get(
  "/my-subscription",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      let studioId = (req as AuthenticatedRequest).studioId;

      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!studioId) {
        const customer = await prisma.customer.findUnique({
          where: { id: user.id },
          select: { studioId: true },
        });
        studioId = customer?.studioId;
      }

      if (!studioId) {
        return res.status(400).json({ error: "No studio context" });
      }

      const subscription = await MembershipService.getActiveSubscription(
        user.id,
        studioId
      );

      if (!subscription) {
        return res.json(null);
      }

      // Get usage stats for the current period
      const bookingsThisWeek = await prisma.openStudioBooking.count({
        where: {
          subscriptionId: subscription.id,
          status: { in: ["RESERVED", "CHECKED_IN", "COMPLETED"] },
          reservedAt: {
            gte: getStartOfWeek(),
          },
        },
      });

      res.json({
        ...subscription,
        usage: {
          bookingsThisWeek,
          maxBookingsPerWeek:
            (subscription.membership.benefits as any)?.openStudio
              ?.maxBookingsPerWeek ?? 0,
        },
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  }
);

// POST /api/memberships/subscribe - Start subscription via Stripe Checkout
router.post(
  "/subscribe",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { membershipId, successUrl, cancelUrl } = req.body;

      if (!membershipId || !successUrl || !cancelUrl) {
        return res.status(400).json({
          error: "membershipId, successUrl, and cancelUrl are required",
        });
      }

      const checkoutUrl = await MembershipService.createSubscriptionCheckout(
        parseInt(membershipId),
        user.id,
        successUrl,
        cancelUrl
      );

      res.json({ url: checkoutUrl });
    } catch (error: any) {
      console.error("Error creating subscription checkout:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout" });
    }
  }
);

// POST /api/memberships/cancel - Cancel subscription
router.post(
  "/cancel",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { subscriptionId, reason } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ error: "subscriptionId is required" });
      }

      // Verify the subscription belongs to this customer
      const subscription = await prisma.membershipSubscription.findUnique({
        where: { id: parseInt(subscriptionId) },
      });

      if (!subscription || subscription.customerId !== user.id) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      const updated = await MembershipService.cancelSubscription(
        parseInt(subscriptionId),
        reason
      );

      res.json(updated);
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ error: error.message || "Failed to cancel subscription" });
    }
  }
);

// POST /api/memberships/customer-portal - Get Stripe Customer Portal URL
router.post(
  "/customer-portal",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { subscriptionId, returnUrl } = req.body;

      if (!subscriptionId || !returnUrl) {
        return res
          .status(400)
          .json({ error: "subscriptionId and returnUrl are required" });
      }

      // Verify ownership
      const subscription = await prisma.membershipSubscription.findUnique({
        where: { id: parseInt(subscriptionId) },
      });

      if (!subscription || subscription.customerId !== user.id) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      const url = await MembershipService.createCustomerPortalSession(
        parseInt(subscriptionId),
        returnUrl
      );

      res.json({ url });
    } catch (error: any) {
      console.error("Error creating customer portal:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to create portal session" });
    }
  }
);

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default router;
