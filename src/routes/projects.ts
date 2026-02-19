import { Router, Request, Response } from "express";
import { ProjectStatus } from "@prisma/client";
import { isAuthenticated } from "../middleware/auth";
import { uploadImages } from "../middleware/upload";
import * as ProjectService from "../services/ProjectService";
import * as FiringService from "../services/FiringService";

const router = Router();

// GET /api/projects/firing-products — Active firing products for customers
router.get(
  "/firing-products",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const products = await FiringService.getFiringProducts();
      // Only return active products to customers
      const active = products.filter((p: any) => p.isActive);
      res.json(active);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/projects — My projects (paginated, filterable)
router.get("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { status, search, tag, page, limit } = req.query;

    const result = await ProjectService.getMyProjects(user.id, {
      status: status as ProjectStatus | undefined,
      search: search as string | undefined,
      tag: tag as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id — Project detail
router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const projectId = parseInt(req.params.id);

    const project = await ProjectService.getProject(projectId, user.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (error: any) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects — Create project
router.post("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { name, description, tags, classSessionId, openStudioBookingId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const studioId = (req as any).studioId;
    const project = await ProjectService.createProject(user.id, studioId, {
      name,
      description,
      tags,
      classSessionId,
      openStudioBookingId,
    });

    res.status(201).json(project);
  } catch (error: any) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id — Update project
router.put("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const projectId = parseInt(req.params.id);
    const { name, description, tags } = req.body;

    const project = await ProjectService.updateProject(projectId, user.id, {
      name,
      description,
      tags,
    });

    res.json(project);
  } catch (error: any) {
    console.error("Error updating project:", error);
    res.status(error.message === "Project not found" ? 404 : 500).json({
      error: error.message,
    });
  }
});

// DELETE /api/projects/:id — Delete project
router.delete("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const projectId = parseInt(req.params.id);

    await ProjectService.deleteProject(projectId, user.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting project:", error);
    const status = error.message.includes("not found")
      ? 404
      : error.message.includes("active firing")
        ? 400
        : 500;
    res.status(status).json({ error: error.message });
  }
});

// POST /api/projects/:id/images — Upload images
router.post(
  "/:id/images",
  isAuthenticated,
  uploadImages.array("images", 5),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const projectId = parseInt(req.params.id);
      const studioId = (req as any).studioId;
      const stage = req.body.stage;

      // Verify ownership
      const project = await ProjectService.getProject(projectId, user.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No images provided" });
      }

      const images = await ProjectService.addImages(
        projectId,
        studioId,
        files,
        stage
      );
      res.status(201).json(images);
    } catch (error: any) {
      console.error("Error uploading images:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/projects/:id/images/:imageId — Remove image
router.delete(
  "/:id/images/:imageId",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const imageId = parseInt(req.params.imageId);

      await ProjectService.removeImage(imageId, user.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing image:", error);
      const status = error.message === "Unauthorized" ? 403 : error.message.includes("not found") ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
);

// POST /api/projects/:id/fire — Purchase a firing
router.post(
  "/:id/fire",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const projectId = parseInt(req.params.id);
      const {
        firingProductId,
        payMethod,
        successUrl,
        cancelUrl,
        subscriptionId,
        customerPunchPassId,
      } = req.body;

      if (!firingProductId || !payMethod) {
        return res
          .status(400)
          .json({ error: "firingProductId and payMethod are required" });
      }

      const result = await FiringService.purchaseFiring(
        projectId,
        firingProductId,
        user.id,
        payMethod,
        { successUrl, cancelUrl, subscriptionId, customerPunchPassId }
      );

      res.json(result);
    } catch (error: any) {
      console.error("Error purchasing firing:", error);
      const status = error.message.includes("not found")
        ? 404
        : error.message.includes("must be in")
          ? 400
          : 500;
      res.status(status).json({ error: error.message });
    }
  }
);

export default router;
