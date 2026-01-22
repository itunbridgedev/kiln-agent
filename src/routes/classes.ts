import { Request, Response, Router } from "express";
import { isAdmin, isAuthenticated } from "../middleware/auth";
import prisma from "../prisma";

const router = Router();

// All class routes require authentication and admin role
router.use(isAuthenticated, isAdmin);

// GET /api/admin/classes - List all classes for the studio
router.get("/", async (req: Request, res: Response) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        category: {
          select: { id: true, name: true },
        },
        teachingRole: {
          select: { id: true, name: true },
        },
        schedules: {
          include: {
            _count: {
              select: { sessions: true, enrollments: true },
            },
          },
          orderBy: { startDate: "desc" },
          take: 5, // Show latest 5 schedules
        },
        steps: {
          orderBy: { stepNumber: "asc" },
        },
        _count: {
          select: { schedules: true, sessions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// GET /api/admin/classes/:id - Get a single class with full details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        category: true,
        schedules: {
          include: {
            sessions: {
              orderBy: { sessionDate: "asc" },
            },
            enrollments: {
              include: {
                customer: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { startDate: "desc" },
        },
        steps: {
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.json(classData);
  } catch (error) {
    console.error("Error fetching class:", error);
    res.status(500).json({ error: "Failed to fetch class" });
  }
});

// POST /api/admin/classes - Create a new class
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      categoryId,
      teachingRoleId,
      name,
      description,
      classType,
      durationWeeks,
      durationHours,
      isRecurring,
      requiresSequence,
      maxStudents,
      price,
      skillLevel,
      imageUrl,
      steps, // For multi-step classes
    } = req.body;

    // Get the Classes category if categoryId not provided
    let finalCategoryId = categoryId ? parseInt(categoryId) : null;
    if (!finalCategoryId) {
      const classesCategory = await prisma.productCategory.findFirst({
        where: { featureModule: "class-management" },
      });
      if (!classesCategory) {
        return res.status(400).json({ error: "Classes category not found" });
      }
      finalCategoryId = classesCategory.id;
    }

    // Create the class
    const classData = await prisma.class.create({
      data: {
        categoryId: finalCategoryId,
        teachingRoleId: teachingRoleId ? parseInt(teachingRoleId) : null,
        name,
        description,
        classType,
        durationWeeks: durationWeeks ? parseInt(durationWeeks) : null,
        durationHours: durationHours ? parseFloat(durationHours) : null,
        isRecurring: isRecurring || false,
        requiresSequence: requiresSequence || false,
        maxStudents: parseInt(maxStudents),
        price: parseFloat(price),
        skillLevel,
        imageUrl,
        isActive: true,
      } as any,
    });

    // If multi-step class, create steps
    if (classType === "multi-step" && steps && steps.length > 0) {
      await prisma.classStep.createMany({
        data: steps.map((step: any, index: number) => ({
          classId: classData.id,
          stepNumber: index + 1,
          name: step.name,
          description: step.description,
          durationHours: step.durationHours,
          learningObjectives: step.learningObjectives,
        })),
      });
    }

    // Fetch the created class with relations
    const createdClass = await prisma.class.findUnique({
      where: { id: classData.id },
      include: {
        category: true,
        steps: {
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    res.status(201).json(createdClass);
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// PUT /api/admin/classes/:id - Update a class
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      categoryId,
      teachingRoleId,
      name,
      description,
      classType,
      durationWeeks,
      durationHours,
      isRecurring,
      requiresSequence,
      maxStudents,
      price,
      skillLevel,
      imageUrl,
      isActive,
      steps,
    } = req.body;

    // Update the class
    const classData = await prisma.class.update({
      where: { id },
      data: {
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        teachingRoleId: teachingRoleId ? parseInt(teachingRoleId) : null,
        name,
        description,
        classType,
        durationWeeks: durationWeeks ? parseInt(durationWeeks) : null,
        durationHours: durationHours ? parseFloat(durationHours) : null,
        isRecurring: isRecurring || false,
        requiresSequence: requiresSequence || false,
        maxStudents: parseInt(maxStudents),
        price: parseFloat(price),
        skillLevel,
        imageUrl,
        isActive,
      } as any,
    });

    // If multi-step class, update steps
    if (classType === "multi-step" && steps) {
      // Delete existing steps
      await prisma.classStep.deleteMany({
        where: { classId: id },
      });

      // Create new steps
      if (steps.length > 0) {
        await prisma.classStep.createMany({
          data: steps.map((step: any, index: number) => ({
            classId: id,
            stepNumber: index + 1,
            name: step.name,
            description: step.description,
            durationHours: step.durationHours,
            learningObjectives: step.learningObjectives,
          })),
        });
      }
    }

    // Fetch updated class with relations
    const updatedClass = await prisma.class.findUnique({
      where: { id },
      include: {
        category: true,
        steps: {
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    res.json(updatedClass);
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(500).json({ error: "Failed to update class" });
  }
});

// DELETE /api/admin/classes/:id - Delete a class
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Check if class has enrollments
    const enrollmentCount = await prisma.classEnrollment.count({
      where: {
        schedule: {
          classId: id,
        },
      },
    });

    if (enrollmentCount > 0) {
      return res.status(400).json({
        error: "Cannot delete class with active enrollments",
      });
    }

    await prisma.class.delete({
      where: { id },
    });

    res.json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("Error deleting class:", error);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

export default router;
