import express, { Request, Response } from "express";
import prisma from "../prisma";

const router = express.Router();

// Public endpoints - no authentication required

// GET /api/products/categories - Get all active categories with their classes
router.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    // Fetch classes for each category
    const enhancedCategories = await Promise.all(
      categories.map(async (category: any) => {
        // Fetch all classes in this category (including subcategories)
        const classes = await prisma.class.findMany({
          where: {
            categoryId: category.id,
            isActive: true,
          },
          include: {
            category: true,
            _count: {
              select: {
                schedules: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        // Transform Class records into product format for display
        const classProducts = classes.map((classData: any) => {
          // Build a rich description
          let description = classData.description || "";

          if (classData.classType === "single-session") {
            description += `\n\n${classData.durationHours} hour workshop`;
          } else if (classData.classType === "multi-session") {
            description += `\n\n${classData.durationWeeks} week course`;
          } else if (classData.classType === "series") {
            description += `\n\nRecurring weekly class`;
          } else if (classData.classType === "multi-step") {
            description += `\n\nMulti-step sequential course`;
          }

          if (classData.skillLevel && classData.skillLevel !== "All Levels") {
            description += ` • ${classData.skillLevel}`;
          }

          if (classData.maxStudents) {
            description += ` • Max ${classData.maxStudents} students`;
          }

          return {
            id: classData.id,
            name: classData.name,
            description: description.trim(),
            price: classData.price.toString(),
            imageUrl: classData.imageUrl,
            displayOrder: 0,
            isActive: classData.isActive,
            categoryId: category.id,
            category: {
              id: category.id,
              name: category.name,
            },
          };
        });

        return {
          ...category,
          products: classProducts,
        };
      })
    );

    res.json(enhancedCategories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/products/category/:id - Get classes by category
router.get("/category/:id", async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    const classes = await prisma.class.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(classes);
  } catch (error) {
    console.error("Error fetching classes by category:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

export default router;
