import { Request, Response, Router } from "express";

const router = Router();

// GET /api/studio - Get current studio info
router.get("/", async (req: Request, res: Response) => {
  try {
    // Check if this is the root domain (marketing page)
    if ((req as any).isRootDomain) {
      return res.json({
        isRootDomain: true,
        name: "Kiln Agent",
        message: "Welcome to Kiln Agent",
      });
    }

    const studio = (req as any).studio;

    if (!studio) {
      return res.status(404).json({ error: "Studio not found" });
    }

    res.json({
      id: studio.id,
      name: studio.name,
      subdomain: studio.subdomain,
      domain: studio.domain,
      isActive: studio.isActive,
      isRootDomain: false,
    });
  } catch (error) {
    console.error("Error fetching studio info:", error);
    res.status(500).json({ error: "Failed to fetch studio info" });
  }
});

export default router;
