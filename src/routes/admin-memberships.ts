import { Request, Response, Router } from "express";
import { isAdmin, isAuthenticated } from "../middleware/auth";
import * as MembershipService from "../services/MembershipService";

const router = Router();

router.use(isAuthenticated, isAdmin);

interface AuthenticatedRequest extends Request {
  studio?: { id: number; subdomain: string; name: string };
  user?: { id: number; email: string; name: string; roles: string[] };
}

// GET /api/admin/memberships - List all membership tiers
router.get("/", async (req: Request, res: Response) => {
  try {
    const studio = (req as AuthenticatedRequest).studio;
    if (!studio) {
      return res.status(400).json({ error: "Studio context required" });
    }

    const memberships = await MembershipService.getAllMemberships(studio.id);
    res.json(memberships);
  } catch (error) {
    console.error("Error fetching memberships:", error);
    res.status(500).json({ error: "Failed to fetch memberships" });
  }
});

// POST /api/admin/memberships - Create a membership tier
router.post("/", async (req: Request, res: Response) => {
  try {
    const studio = (req as AuthenticatedRequest).studio;
    if (!studio) {
      return res.status(400).json({ error: "Studio context required" });
    }

    const { name, description, price, billingPeriod, benefits, displayOrder } =
      req.body;

    if (!name || !price || !billingPeriod) {
      return res
        .status(400)
        .json({ error: "Name, price, and billing period are required" });
    }

    const membership = await MembershipService.createMembership({
      studioId: studio.id,
      name,
      description,
      price: parseFloat(price),
      billingPeriod,
      benefits,
      displayOrder: displayOrder ? parseInt(displayOrder) : undefined,
    });

    res.status(201).json(membership);
  } catch (error: any) {
    console.error("Error creating membership:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "A membership with this name already exists" });
    }
    res.status(500).json({ error: "Failed to create membership" });
  }
});

// PUT /api/admin/memberships/:id - Update a membership tier
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, price, billingPeriod, benefits, isActive, displayOrder } =
      req.body;

    const membership = await MembershipService.updateMembership(id, {
      name,
      description,
      price: price !== undefined ? parseFloat(price) : undefined,
      billingPeriod,
      benefits,
      isActive,
      displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : undefined,
    });

    res.json(membership);
  } catch (error: any) {
    console.error("Error updating membership:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "A membership with this name already exists" });
    }
    res.status(500).json({ error: "Failed to update membership" });
  }
});

// POST /api/admin/memberships/:id/sync-stripe - Create Stripe product/price for a membership that's missing one
router.post("/:id/sync-stripe", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Trigger update with no changes - this will create Stripe product/price if missing
    const membership = await MembershipService.updateMembership(id, {});

    if (!membership.stripePriceId) {
      return res.status(400).json({
        error: "Studio has no Stripe account connected. Connect Stripe first.",
      });
    }

    res.json(membership);
  } catch (error: any) {
    console.error("Error syncing membership to Stripe:", error);
    res.status(500).json({ error: "Failed to sync membership to Stripe" });
  }
});

// GET /api/admin/memberships/subscribers - List all subscribers
router.get("/subscribers", async (req: Request, res: Response) => {
  try {
    const studio = (req as AuthenticatedRequest).studio;
    if (!studio) {
      return res.status(400).json({ error: "Studio context required" });
    }

    const { status } = req.query;
    const subscriptions = await MembershipService.getStudioSubscriptions(
      studio.id,
      status as any
    );

    res.json(subscriptions);
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    res.status(500).json({ error: "Failed to fetch subscribers" });
  }
});

export default router;
