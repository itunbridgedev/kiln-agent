import express, { Request, Response } from "express";
import { isAuthenticated } from "../middleware/auth";
import prisma from "../prisma";

const router = express.Router();

// Middleware to check if user has staff access (admin, manager, or staff)
const isAdmin = async (req: Request, res: Response, next: () => void) => {
  try {
    if (!(req.user as any)?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: (req.user as any).id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    const hasStaffAccess = customer?.roles.some((cr: any) =>
      ["admin", "manager", "staff"].includes(cr.role.name)
    );

    if (!hasStaffAccess) {
      return res
        .status(403)
        .json({ error: "Access denied. Staff access required." });
    }

    next();
  } catch (error) {
    console.error("Error checking staff access:", error);
    res.status(500).json({ error: "Failed to verify access status" });
  }
};

// All admin routes require authentication and admin role
router.use(isAuthenticated, isAdmin);

// ============= PRODUCT CATEGORY MANAGEMENT =============

// GET /api/admin/categories - Get all categories (including inactive)
router.get(
  "/categories",
  async (req: express.Request, res: express.Response) => {
    try {
      const categories = await prisma.productCategory.findMany({
        include: {
          _count: {
            select: { classes: true },
          },
        },
        orderBy: { displayOrder: "asc" },
      });

      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  }
);

// POST /api/admin/categories - Create new category
router.post(
  "/categories",
  async (req: express.Request, res: express.Response) => {
    try {
      const { name, description, displayOrder, isActive, parentCategoryId } =
        req.body;

      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }

      const category = await prisma.productCategory.create({
        data: {
          name,
          description,
          displayOrder: displayOrder || 0,
          isActive: isActive !== undefined ? isActive : true,
          parentCategoryId: parentCategoryId || null,
        } as any,
      });

      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating category:", error);
      if (error.code === "P2002") {
        return res.status(400).json({ error: "Category name already exists" });
      }
      res.status(500).json({ error: "Failed to create category" });
    }
  }
);

// PUT /api/admin/categories/:id - Update category
router.put(
  "/categories/:id",
  async (req: express.Request, res: express.Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, displayOrder, isActive, parentCategoryId } =
        req.body;

      // Check if this is a system category
      const existingCategory = await prisma.productCategory.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Prevent editing core fields of system categories
      if (existingCategory.isSystemCategory && name !== existingCategory.name) {
        return res.status(403).json({
          error:
            "Cannot rename system categories. System category names are protected.",
        });
      }

      // Prevent circular references
      if (parentCategoryId === id) {
        return res
          .status(400)
          .json({ error: "Category cannot be its own parent" });
      }

      const category = await prisma.productCategory.update({
        where: { id },
        data: {
          name,
          description,
          displayOrder,
          isActive,
          parentCategoryId: parentCategoryId || null,
        },
      });

      res.json(category);
    } catch (error: any) {
      console.error("Error updating category:", error);
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Category not found" });
      }
      if (error.code === "P2002") {
        return res.status(400).json({ error: "Category name already exists" });
      }
      res.status(500).json({ error: "Failed to update category" });
    }
  }
);

// DELETE /api/admin/categories/:id - Delete category
router.delete(
  "/categories/:id",
  async (req: express.Request, res: express.Response) => {
    try {
      const id = parseInt(req.params.id);

      // Check if category has classes
      const category = await prisma.productCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { classes: true },
          },
        },
      });

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Prevent deletion of system categories
      if (category.isSystemCategory) {
        return res.status(403).json({
          error:
            "Cannot delete system categories. System categories are protected.",
        });
      }

      if (category._count.classes > 0) {
        return res.status(400).json({
          error:
            "Cannot delete category with existing classes. Delete or reassign classes first.",
        });
      }

      await prisma.productCategory.delete({
        where: { id },
      });

      res.json({ message: "Category deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Category not found" });
      }
      res.status(500).json({ error: "Failed to delete category" });
    }
  }
);

export default router;
