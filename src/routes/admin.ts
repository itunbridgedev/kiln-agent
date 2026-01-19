import { Request, Response, Router } from "express";
import { isAuthenticated } from "../middleware/auth";
import prisma from "../prisma";

const router = Router();

// Middleware to check if user is admin
const isAdmin = async (req: Request, res: Response, next: any) => {
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

    const hasAdminRole = customer?.roles.some((cr) => cr.role.name === "admin");

    if (!hasAdminRole) {
      return res
        .status(403)
        .json({ error: "Access denied. Admin role required." });
    }

    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    res.status(500).json({ error: "Failed to verify admin status" });
  }
};

// All admin routes require authentication and admin role
router.use(isAuthenticated, isAdmin);

// ============= PRODUCT CATEGORY MANAGEMENT =============

// GET /api/admin/categories - Get all categories (including inactive)
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const categories = await prisma.productCategory.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/admin/categories - Create new category
router.post("/categories", async (req: Request, res: Response) => {
  try {
    const { name, description, displayOrder, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const category = await prisma.productCategory.create({
      data: {
        name,
        description,
        displayOrder: displayOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
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
});

// PUT /api/admin/categories/:id - Update category
router.put("/categories/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, displayOrder, isActive } = req.body;

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        name,
        description,
        displayOrder,
        isActive,
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
});

// DELETE /api/admin/categories/:id - Delete category
router.delete("/categories/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Check if category has products
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (category._count.products > 0) {
      return res.status(400).json({
        error:
          "Cannot delete category with existing products. Delete or reassign products first.",
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
});

// ============= PRODUCT MANAGEMENT =============

// GET /api/admin/products - Get all products (including inactive)
router.get("/products", async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }],
    });

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// POST /api/admin/products - Create new product
router.post("/products", async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      price,
      categoryId,
      imageUrl,
      displayOrder,
      isActive,
    } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({
        error: "Product name, price, and category are required",
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        categoryId: parseInt(categoryId),
        imageUrl,
        displayOrder: displayOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
      } as any,
      include: {
        category: true,
      },
    });

    res.status(201).json(product);
  } catch (error: any) {
    console.error("Error creating product:", error);
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PUT /api/admin/products/:id - Update product
router.put("/products/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      name,
      description,
      price,
      categoryId,
      imageUrl,
      displayOrder,
      isActive,
    } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        imageUrl,
        displayOrder,
        isActive,
      },
      include: {
        category: true,
      },
    });

    res.json(product);
  } catch (error: any) {
    console.error("Error updating product:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /api/admin/products/:id - Delete product
router.delete("/products/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
