import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Public endpoints - no authentication required

// GET /api/products - Get all active products with categories
router.get("/", async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
      },
      orderBy: [
        { category: { displayOrder: "asc" } },
        { displayOrder: "asc" },
      ],
    });

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/categories - Get all active categories with their products
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
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

// GET /api/products/category/:id - Get products by category
router.get("/category/:id", async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    const products = await prisma.product.findMany({
      where: { 
        categoryId,
        isActive: true 
      },
      include: {
        category: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    res.json(products);
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

export default router;
