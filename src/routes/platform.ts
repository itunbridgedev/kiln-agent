import { Request, Response, Router } from "express";
import { isAuthenticated } from "../middleware/auth";
import { isPlatformAdmin } from "../middleware/platformAdmin";
import { basePrisma } from "../prisma";

const router = Router();

// All platform routes require authenticated platform admin
router.use(isAuthenticated, isPlatformAdmin);

/**
 * GET /api/platform/dashboard
 * Platform-wide stats
 */
router.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    const [studioCount, activeStudioCount, customerCount] = await Promise.all([
      basePrisma.studio.count(),
      basePrisma.studio.count({ where: { isActive: true } }),
      basePrisma.customer.count(),
    ]);

    res.json({
      studioCount,
      activeStudioCount,
      customerCount,
    });
  } catch (error) {
    console.error("Error fetching platform dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

/**
 * GET /api/platform/studios
 * List all studios with counts and fee info
 */
router.get("/studios", async (_req: Request, res: Response) => {
  try {
    const studios = await basePrisma.studio.findMany({
      include: {
        _count: {
          select: {
            customers: true,
            classes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const defaultFee = parseFloat(
      process.env.STRIPE_PLATFORM_FEE_PERCENTAGE || "0.03"
    );

    const result = studios.map((studio) => ({
      id: studio.id,
      name: studio.name,
      subdomain: studio.subdomain,
      isActive: studio.isActive,
      createdAt: studio.createdAt,
      stripeAccountId: studio.stripeAccountId,
      stripeAccountStatus: studio.stripeAccountStatus,
      stripeChargesEnabled: studio.stripeChargesEnabled,
      platformFeePercentage: studio.platformFeePercentage
        ? parseFloat(studio.platformFeePercentage.toString())
        : defaultFee,
      isCustomFee: studio.platformFeePercentage !== null,
      customerCount: studio._count.customers,
      classCount: studio._count.classes,
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching studios:", error);
    res.status(500).json({ error: "Failed to fetch studios" });
  }
});

/**
 * GET /api/platform/studios/:id
 * Studio detail
 */
router.get("/studios/:id", async (req: Request, res: Response) => {
  try {
    const studioId = parseInt(req.params.id);
    if (isNaN(studioId)) {
      return res.status(400).json({ error: "Invalid studio ID" });
    }

    const studio = await basePrisma.studio.findUnique({
      where: { id: studioId },
      include: {
        _count: {
          select: {
            customers: true,
            classes: true,
          },
        },
      },
    });

    if (!studio) {
      return res.status(404).json({ error: "Studio not found" });
    }

    const defaultFee = parseFloat(
      process.env.STRIPE_PLATFORM_FEE_PERCENTAGE || "0.03"
    );

    res.json({
      ...studio,
      platformFeePercentage: studio.platformFeePercentage
        ? parseFloat(studio.platformFeePercentage.toString())
        : defaultFee,
      isCustomFee: studio.platformFeePercentage !== null,
    });
  } catch (error) {
    console.error("Error fetching studio:", error);
    res.status(500).json({ error: "Failed to fetch studio" });
  }
});

/**
 * PATCH /api/platform/studios/:id
 * Update studio platform settings (fee, active status)
 */
router.patch("/studios/:id", async (req: Request, res: Response) => {
  try {
    const studioId = parseInt(req.params.id);
    if (isNaN(studioId)) {
      return res.status(400).json({ error: "Invalid studio ID" });
    }

    const { platformFeePercentage, isActive } = req.body;

    const updateData: any = {};

    if (platformFeePercentage !== undefined) {
      if (platformFeePercentage === null) {
        // Reset to global default
        updateData.platformFeePercentage = null;
      } else {
        const fee = parseFloat(platformFeePercentage);
        if (isNaN(fee) || fee < 0 || fee > 1) {
          return res
            .status(400)
            .json({ error: "Fee must be between 0 and 1 (e.g., 0.03 for 3%)" });
        }
        updateData.platformFeePercentage = fee;
      }
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const studio = await basePrisma.studio.update({
      where: { id: studioId },
      data: updateData,
    });

    res.json({
      id: studio.id,
      name: studio.name,
      platformFeePercentage: studio.platformFeePercentage
        ? parseFloat(studio.platformFeePercentage.toString())
        : parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENTAGE || "0.03"),
      isActive: studio.isActive,
    });
  } catch (error) {
    console.error("Error updating studio:", error);
    res.status(500).json({ error: "Failed to update studio" });
  }
});

export default router;
