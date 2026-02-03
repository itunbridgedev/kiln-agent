import { Request, Response, Router } from "express";
import { isAdmin, isAuthenticated } from "../middleware/auth";
import prisma from "../prisma";

const router = Router();

// All resource routes require authentication and admin role
router.use(isAuthenticated, isAdmin);

interface AuthenticatedRequest extends Request {
  studio?: {
    id: number;
    subdomain: string;
    name: string;
  };
  user?: {
    id: number;
    email: string;
    name: string;
    roles: string[];
  };
}

// GET /api/admin/resources - List all studio resources
router.get("/", async (req: Request, res: Response) => {
  try {
    // Prisma middleware auto-filters by studioId from tenant context
    const resources = await prisma.studioResource.findMany({
      orderBy: { name: "asc" },
    });

    res.json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

// POST /api/admin/resources - Create a new resource
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, quantity } = req.body;
    const studio = (req as AuthenticatedRequest).studio;

    if (!studio) {
      return res.status(400).json({ error: "Studio context required" });
    }

    if (!name || !quantity) {
      return res.status(400).json({ error: "Name and quantity are required" });
    }

    // Explicitly pass studioId - Prisma middleware should also inject it
    const resource = await prisma.studioResource.create({
      data: {
        studioId: studio.id,
        name,
        description,
        quantity: parseInt(quantity),
      },
    });

    res.status(201).json(resource);
  } catch (error: any) {
    console.error("Error creating resource:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "A resource with this name already exists" });
    }
    res.status(500).json({ error: "Failed to create resource" });
  }
});

// PUT /api/admin/resources/:id - Update a resource
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, quantity, isActive } = req.body;

    // Prisma middleware auto-filters by studioId - verify resource exists
    const existing = await prisma.studioResource.findFirst({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const resource = await prisma.studioResource.update({
      where: { id },
      data: {
        name,
        description,
        quantity: quantity ? parseInt(quantity) : undefined,
        isActive,
      },
    });

    res.json(resource);
  } catch (error: any) {
    console.error("Error updating resource:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "A resource with this name already exists" });
    }
    res.status(500).json({ error: "Failed to update resource" });
  }
});

// DELETE /api/admin/resources/:id - Delete a resource
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Prisma middleware auto-filters by studioId - verify resource exists
    const existing = await prisma.studioResource.findFirst({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Check if resource is used by any classes
    const usageCount = await prisma.classResourceRequirement.count({
      where: { resourceId: id },
    });

    if (usageCount > 0) {
      return res.status(400).json({
        error: `Cannot delete resource. It is required by ${usageCount} class(es).`,
      });
    }

    await prisma.studioResource.delete({
      where: { id },
    });

    res.json({ message: "Resource deleted successfully" });
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

// GET /api/admin/resources/availability - Check availability for all resources for a session
router.get("/availability", async (req: Request, res: Response) => {
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

    // Get all resources for this studio (Prisma middleware auto-filters by studioId)
    const resources = await prisma.studioResource.findMany({});

    // Find all overlapping sessions
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

    // Get all allocations for these sessions
    const allocations = await prisma.sessionResourceAllocation.findMany({
      where: {
        sessionId: { in: sessionIds },
        registration: {
          registrationStatus: "CONFIRMED",
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
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

// GET /api/admin/resources/:id/availability - Check resource availability for a date/time
router.get("/:id/availability", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    // Prisma middleware auto-filters by studioId
    const resource = await prisma.studioResource.findFirst({
      where: { id },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const session = await prisma.classSession.findUnique({
      where: { id: parseInt(sessionId as string) },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Find all overlapping sessions (Prisma middleware auto-filters by studioId)
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

    // Calculate allocated resources
    const allocations = await prisma.sessionResourceAllocation.findMany({
      where: {
        resourceId: id,
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
    const available = resource.quantity - totalAllocated;

    res.json({
      resourceId: id,
      resourceName: resource.name,
      totalQuantity: resource.quantity,
      allocated: totalAllocated,
      available,
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

export default router;
