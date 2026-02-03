import { Request, Response, Router } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../prisma";
import * as stripeService from "../services/stripe";

const router = Router();

/**
 * POST /api/stripe/connect/onboard
 * Initiate Stripe Connect onboarding for a studio
 * Requires: Admin role
 */
router.post("/onboard", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    const user = (req as AuthenticatedRequest).user;

    if (!studioId || !user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is admin
    const isAdmin = user.roles?.some((role) => role.role.name === "ADMIN");
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: "Only admins can onboard Stripe Connect" });
    }

    // Get studio details
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
    });

    if (!studio) {
      return res.status(404).json({ error: "Studio not found" });
    }

    // Check if already has Stripe account
    let accountId = studio.stripeAccountId;

    if (!accountId) {
      // Create new Connect account
      accountId = await stripeService.createConnectAccount(
        studioId,
        user.email,
        studio.name
      );
    }

    // Create onboarding link
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const refreshUrl = `${clientUrl}/admin/settings/payments?refresh=true`;
    const returnUrl = `${clientUrl}/admin/settings/payments?success=true`;

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
 * Requires: Admin role
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    const user = (req as AuthenticatedRequest).user;

    if (!studioId || !user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is admin
    const isAdmin = user.roles?.some((role) => role.role.name === "ADMIN");
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: "Only admins can view Connect status" });
    }

    // Get studio with Stripe details
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        stripeAccountId: true,
        stripeAccountStatus: true,
        stripeOnboardedAt: true,
        stripeDetailsSubmitted: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
      },
    });

    if (!studio) {
      return res.status(404).json({ error: "Studio not found" });
    }

    if (!studio.stripeAccountId) {
      return res.json({
        connected: false,
        status: "not_started",
      });
    }

    // Sync latest status from Stripe
    await stripeService.syncStudioAccountStatus(studioId);

    // Re-fetch updated studio data
    const updatedStudio = await prisma.studio.findUnique({
      where: { id: studioId },
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
 * Requires: Admin role
 */
router.post("/dashboard", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    const user = (req as AuthenticatedRequest).user;

    if (!studioId || !user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is admin
    const isAdmin = user.roles?.some((role) => role.role.name === "ADMIN");
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: "Only admins can access Dashboard" });
    }

    // Get studio's Stripe account ID
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { stripeAccountId: true },
    });

    if (!studio?.stripeAccountId) {
      return res
        .status(400)
        .json({ error: "Studio does not have a Stripe account" });
    }

    // Create login link
    const dashboardUrl = await stripeService.createLoginLink(
      studio.stripeAccountId
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
 * Requires: Admin role
 */
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const studioId = (req as AuthenticatedRequest).studioId;
    const user = (req as AuthenticatedRequest).user;

    if (!studioId || !user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is admin
    const isAdmin = user.roles?.some((role) => role.role.name === "ADMIN");
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get studio's Stripe account ID
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { stripeAccountId: true },
    });

    if (!studio?.stripeAccountId) {
      return res
        .status(400)
        .json({ error: "Studio does not have a Stripe account" });
    }

    // Create new onboarding link
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const refreshUrl = `${clientUrl}/admin/settings/payments?refresh=true`;
    const returnUrl = `${clientUrl}/admin/settings/payments?success=true`;

    const onboardingUrl = await stripeService.createAccountLink(
      studio.stripeAccountId,
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
