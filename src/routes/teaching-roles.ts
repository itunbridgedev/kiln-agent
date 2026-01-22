import { Request, Response, Router } from "express";
import { isAdmin, isAuthenticated } from "../middleware/auth";
import prisma from "../prisma";

const router = Router();

// All teaching role routes require authentication and admin role
router.use(isAuthenticated, isAdmin);

// Get all teaching roles for the studio
router.get("/", async (req: Request, res: Response) => {
  try {
    const roles = await prisma.teachingRole.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: {
            staffRoles: true,
            classes: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json(roles);
  } catch (error) {
    console.error("Error fetching teaching roles:", error);
    res.status(500).json({ error: "Failed to fetch teaching roles" });
  }
});

// Get a single teaching role by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const role = await prisma.teachingRole.findFirst({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        staffRoles: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        classes: {
          select: {
            id: true,
            name: true,
            classType: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: "Teaching role not found" });
    }

    res.json(role);
  } catch (error) {
    console.error("Error fetching teaching role:", error);
    res.status(500).json({ error: "Failed to fetch teaching role" });
  }
});

// Create a new teaching role
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Check if role with this name already exists
    const existing = await prisma.teachingRole.findFirst({
      where: {
        name: name.trim(),
      },
    });

    if (existing) {
      return res
        .status(400)
        .json({ error: "A teaching role with this name already exists" });
    }

    const role = await prisma.teachingRole.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        studioId: 0, // Will be overridden by tenant middleware
      },
    });

    res.status(201).json(role);
  } catch (error) {
    console.error("Error creating teaching role:", error);
    res.status(500).json({ error: "Failed to create teaching role" });
  }
});

// Update a teaching role
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { name, description, isActive } = req.body;

    // Verify role exists and belongs to studio
    const existing = await prisma.teachingRole.findFirst({
      where: {
        id: parseInt(req.params.id),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Teaching role not found" });
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.teachingRole.findFirst({
        where: {
          name: name.trim(),
          id: { not: existing.id },
        },
      });

      if (duplicate) {
        return res
          .status(400)
          .json({ error: "A teaching role with this name already exists" });
      }
    }

    const role = await prisma.teachingRole.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name: name ? name.trim() : undefined,
        description:
          description !== undefined ? description?.trim() || null : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json(role);
  } catch (error) {
    console.error("Error updating teaching role:", error);
    res.status(500).json({ error: "Failed to update teaching role" });
  }
});

// Delete a teaching role (soft delete by setting isActive to false)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    // Verify role exists and belongs to studio
    const existing = await prisma.teachingRole.findFirst({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        _count: {
          select: {
            classes: true,
            staffRoles: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Teaching role not found" });
    }

    // Check if role is in use
    if (existing._count.classes > 0) {
      return res.status(400).json({
        error: `Cannot delete teaching role. It is assigned to ${existing._count.classes} class(es)`,
      });
    }

    // Soft delete: set isActive to false
    await prisma.teachingRole.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });

    res.json({ message: "Teaching role deleted successfully" });
  } catch (error) {
    console.error("Error deleting teaching role:", error);
    res.status(500).json({ error: "Failed to delete teaching role" });
  }
});

// Get all staff members with their teaching roles
router.get("/staff/all", async (req: Request, res: Response) => {
  try {
    // Get all staff members (users with Staff, Manager, or Admin roles)
    const staff = await prisma.customer.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: {
                in: ["Staff", "Manager", "Admin"],
              },
            },
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        staffTeachingRoles: {
          include: {
            role: true,
          },
          where: {
            role: {
              isActive: true,
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// Assign a teaching role to a staff member
router.post("/staff/:userId/roles", async (req: Request, res: Response) => {
  try {
    const { roleId, certifiedAt, notes } = req.body;
    const userId = parseInt(req.params.userId);

    if (!roleId) {
      return res.status(400).json({ error: "Role ID is required" });
    }

    // Verify user exists and belongs to studio
    const user = await prisma.customer.findFirst({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify teaching role exists and belongs to studio
    const role = await prisma.teachingRole.findFirst({
      where: {
        id: roleId,
        isActive: true,
      },
    });

    if (!role) {
      return res.status(404).json({ error: "Teaching role not found" });
    }

    // Check if assignment already exists
    const existing = await prisma.staffTeachingRole.findUnique({
      where: {
        customerId_roleId: {
          customerId: userId,
          roleId: roleId,
        },
      },
    });

    if (existing) {
      return res
        .status(400)
        .json({ error: "User already has this teaching role" });
    }

    const assignment = await prisma.staffTeachingRole.create({
      data: {
        customerId: userId,
        roleId: roleId,
        certifiedAt: certifiedAt ? new Date(certifiedAt) : null,
        notes: notes?.trim() || null,
      },
      include: {
        role: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error assigning teaching role:", error);
    console.error("Full error details:", JSON.stringify(error, null, 2));
    res.status(500).json({
      error: "Failed to assign teaching role",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Remove a teaching role from a staff member
router.delete(
  "/staff/:userId/roles/:roleId",
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const roleId = parseInt(req.params.roleId);

      // Verify user belongs to studio
      const user = await prisma.customer.findFirst({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify assignment exists
      const assignment = await prisma.staffTeachingRole.findUnique({
        where: {
          customerId_roleId: {
            customerId: userId,
            roleId: roleId,
          },
        },
      });

      if (!assignment) {
        return res
          .status(404)
          .json({ error: "Teaching role assignment not found" });
      }

      await prisma.staffTeachingRole.delete({
        where: {
          customerId_roleId: {
            customerId: userId,
            roleId: roleId,
          },
        },
      });

      res.json({ message: "Teaching role removed successfully" });
    } catch (error) {
      console.error("Error removing teaching role:", error);
      console.error("Full error details:", JSON.stringify(error, null, 2));
      res.status(500).json({
        error: "Failed to remove teaching role",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

export default router;
