import { Router, Request, Response } from "express";
import { ProjectStatus } from "@prisma/client";
import { isAuthenticated, isAdmin } from "../middleware/auth";
import { uploadImages } from "../middleware/upload";
import * as ProjectService from "../services/ProjectService";
import * as FiringService from "../services/FiringService";

const router = Router();

// --- Project Management ---

// GET /api/admin/projects — All projects (filterable by status)
router.get(
  "/projects",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { status, customerId, search } = req.query;
      const projects = await ProjectService.getProjectsByStatus({
        status: status as ProjectStatus | undefined,
        customerId: customerId ? parseInt(customerId as string) : undefined,
        search: search as string | undefined,
      });
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/admin/projects/board — Board view (grouped by status)
router.get(
  "/projects/board",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const board = await ProjectService.getProjectsBoard();
      res.json(board);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/admin/projects/:id — Project detail
router.get(
  "/projects/:id",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const project = await ProjectService.getProject(
        parseInt(req.params.id)
      );
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/admin/projects/:id/status — Update project status
router.put(
  "/projects/:id/status",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { status, note } = req.body;
      const projectId = parseInt(req.params.id);

      if (!status || !Object.values(ProjectStatus).includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const project = await ProjectService.updateProjectStatus(
        projectId,
        status as ProjectStatus,
        user.id,
        note
      );
      res.json(project);
    } catch (error: any) {
      const status = error.message.includes("not found")
        ? 404
        : error.message.includes("Invalid status transition")
          ? 400
          : 500;
      res.status(status).json({ error: error.message });
    }
  }
);

// POST /api/admin/projects/batch-status — Batch update statuses
router.post(
  "/projects/batch-status",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { projectIds, status } = req.body;

      if (!projectIds?.length || !status) {
        return res
          .status(400)
          .json({ error: "projectIds and status are required" });
      }

      const results = await ProjectService.batchUpdateStatus(
        projectIds,
        status as ProjectStatus,
        user.id
      );
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/admin/projects/:id/images — Admin upload images
router.post(
  "/projects/:id/images",
  isAuthenticated,
  isAdmin,
  uploadImages.array("images", 5),
  async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const studioId = (req as any).studioId;
      const stage = req.body.stage;
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
      res.status(500).json({ error: error.message });
    }
  }
);

// --- Firing Products ---

// GET /api/admin/firing-products
router.get(
  "/firing-products",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const products = await FiringService.getFiringProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/admin/firing-products
router.post(
  "/firing-products",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const studioId = (req as any).studioId;
      const product = await FiringService.createFiringProduct(studioId, req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/admin/firing-products/:id
router.put(
  "/firing-products/:id",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const product = await FiringService.updateFiringProduct(
        parseInt(req.params.id),
        req.body
      );
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/admin/firing-products/:id/sync-stripe
router.post(
  "/firing-products/:id/sync-stripe",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const product = await FiringService.syncFiringProductToStripe(
        parseInt(req.params.id)
      );
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
