import { Request, Response, Router } from "express";
import { isAuthenticated, isAdmin } from "../middleware/auth";
import prisma from "../prisma";
import * as stripeService from "../services/stripe";

const router = Router();

// All stripe-connect routes require authenticated admin/staff access
router.use(isAuthenticated, isAdmin);

interface AuthenticatedRequest extends Request {
  studio?: { id: number; subdomain: string; name: string };
  user?: { id: number; email: string; name: string; roles?: Array<{ role: { name: string } }> };
}

/**
 * POST /api/stripe/connect/onboard
 * Initiate Stripe Connect onboarding for a studio
 */
router.post("/onboard", async (req: Request, res: Response) => {
  try {
    const studio = (req as AuthenticatedRequest).studio;
    const user = (req as AuthenticatedRequest).user;

    if (!studio || !user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get studio details (full record with Stripe fields)
    const studioRecord = await prisma.studio.findUnique({
      where: { id: studio.id },
    });

    if (!studioRecord) {
      return res.status(404).json({ error: "Studio not found" });
    }

    // Check if already has Stripe account
    let accountId = studioRecord.stripeAccountId;

    if (!accountId) {
      // Create new Connect account
      accountId = await stripeService.createConnectAccount(
        studio.id,
        user.email,
        studioRecord.name
      );
    }

    // Create onboarding link
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const refreshUrl = `${clientUrl}/admin?stripe-refresh=true`;
    const returnUrl = `${clientUrl}/admin?stripe-success=true`;

    const onboardingUrl = await stripeService.createAccountLink(
      accountId,
      refreshUrl,
      returnUrl
    );

    res.json({
      accountId,
      onboardingUrl,
    });
  } catch (error) {
    console.error("Error initiating Connect onboarding:", error);
    res.status(500).json({ error: "Failed to initiate onboarding" });
  }
});

/**
 * GET /api/stripe/connect/status
 * Get current Stripe Connect onboarding status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const studio = (req as AuthenticatedRequest).studio;

    if (!studio) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get studio with Stripe details
    const studioRecord = await prisma.studio.findUnique({
      where: { id: studio.id },
      select: {
        stripeAccountId: true,
        stripeAccountStatus: true,
        stripeOnboardedAt: true,
        stripeDetailsSubmitted: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
      },
    });

    if (!studioRecord) {
      return res.status(404).json({ error: "Studio not found" });
    }

    if (!studioRecord.stripeAccountId) {
      return res.json({
        connected: false,
        status: "not_started",
      });
    }

    // Sync latest status from Stripe
    await stripeService.syncStudioAccountStatus(studio.id);

    // Re-fetch updated studio data
    const updatedStudio = await prisma.studio.findUnique({
      where: { id: studio.id },
      select: {
        stripeAccountId: true,
        stripeAccountStatus: true,
        stripeOnboardedAt: true,
        stripeDetailsSubmitted: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
      },
    });

    res.json({
      connected: true,
      accountId: updatedStudio?.stripeAccountId,
      status: updatedStudio?.stripeAccountStatus,
      onboardedAt: updatedStudio?.stripeOnboardedAt,
      detailsSubmitted: updatedStudio?.stripeDetailsSubmitted,
      chargesEnabled: updatedStudio?.stripeChargesEnabled,
      payoutsEnabled: updatedStudio?.stripePayoutsEnabled,
    });
  } catch (error) {
    console.error("Error fetching Connect status:", error);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

/**
 * POST /api/stripe/connect/dashboard
 * Create a login link to Stripe Connect Dashboard
 */
router.post("/dashboard", async (req: Request, res: Response) => {
  try {
    const studio = (req as AuthenticatedRequest).studio;

    if (!studio) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get studio's Stripe account ID
    const studioRecord = await prisma.studio.findUnique({
      where: { id: studio.id },
      select: { stripeAccountId: true },
    });

    if (!studioRecord?.stripeAccountId) {
      return res
        .status(400)
        .json({ error: "Studio does not have a Stripe account" });
    }

    // Create login link
    const dashboardUrl = await stripeService.createLoginLink(
      studioRecord.stripeAccountId
    );

    res.json({ url: dashboardUrl });
  } catch (error) {
    console.error("Error creating dashboard link:", error);
    res.status(500).json({ error: "Failed to create dashboard link" });
  }
});

/**
 * POST /api/stripe/connect/refresh
 * Refresh onboarding link (when user needs to complete more information)
 */
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const studio = (req as AuthenticatedRequest).studio;

    if (!studio) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get studio's Stripe account ID
    const studioRecord = await prisma.studio.findUnique({
      where: { id: studio.id },
      select: { stripeAccountId: true },
    });

    if (!studioRecord?.stripeAccountId) {
      return res
        .status(400)
        .json({ error: "Studio does not have a Stripe account" });
    }

    // Create new onboarding link
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const refreshUrl = `${clientUrl}/admin?stripe-refresh=true`;
    const returnUrl = `${clientUrl}/admin?stripe-success=true`;

    const onboardingUrl = await stripeService.createAccountLink(
      studioRecord.stripeAccountId,
      refreshUrl,
      returnUrl
    );

    res.json({ onboardingUrl });
  } catch (error) {
    console.error("Error refreshing onboarding link:", error);
    res.status(500).json({ error: "Failed to refresh onboarding link" });
  }
});

export default router;
