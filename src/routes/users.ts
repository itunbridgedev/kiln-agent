import { PrismaClient } from "@prisma/client";
import express from "express";
import { isAdmin, isAuthenticated } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(isAuthenticated);
router.use(isAdmin);

// GET /api/admin/users - Search and list all users
router.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const { search } = req.query;

    const whereClause: {
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    if (search && typeof search === "string") {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.customer.findMany({
      where: whereClause,
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
        },
      },
      orderBy: {
        name: "asc",
      },
      take: 50, // Limit results for performance
    });

    // Transform to simpler format
    const userList = users.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      picture: user.picture,
      createdAt: user.createdAt,
      systemRoles: user.roles.map((r: any) => r.role.name),
      teachingRoles: user.staffTeachingRoles.map((tr: any) => ({
        id: tr.roleId,
        name: tr.role.name,
        certifiedAt: tr.certifiedAt,
      })),
    }));

    res.json(userList);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/admin/users/:id - Get single user details
router.get("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const userId = parseInt(req.params.id);

    const user = await prisma.customer.findUnique({
      where: { id: userId },
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
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Transform to simpler format
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      picture: user.picture,
      agreedToTerms: user.agreedToTerms,
      agreedToSms: user.agreedToSms,
      createdAt: user.createdAt,
      systemRoles: user.roles.map((r: any) => r.role.name),
      teachingRoles: user.staffTeachingRoles.map((tr: any) => ({
        id: tr.roleId,
        name: tr.role.name,
        certifiedAt: tr.certifiedAt,
        notes: tr.notes,
      })),
    };

    res.json(userData);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PUT /api/admin/users/:id/roles - Update user's system roles
router.put(
  "/:id/roles",
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { roles } = req.body; // Array of role names: ['admin', 'manager', 'staff', 'user']

      if (!Array.isArray(roles)) {
        return res.status(400).json({ error: "Roles must be an array" });
      }

      // Get current user's roles to check permissions
      const currentUser = req.user as { id: number };
      const currentUserData = await prisma.customer.findUnique({
        where: { id: currentUser.id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      const currentUserRoles =
        currentUserData?.roles.map((r: any) => r.role.name) || [];
      const isAdmin = currentUserRoles.includes("admin");
      const isManager = currentUserRoles.includes("manager");

      // Validate role permissions
      const validRoles = ["admin", "manager", "staff", "user"];
      const rolesToAssign = roles.filter((r: string) =>
        validRoles.includes(r.toLowerCase())
      );

      // Check if user is trying to assign roles they don't have permission for
      for (const roleName of rolesToAssign) {
        const role = roleName.toLowerCase();

        // Only Admin can assign Admin or Manager roles
        if ((role === "admin" || role === "manager") && !isAdmin) {
          return res.status(403).json({
            error: `Only Admins can assign ${roleName} role`,
          });
        }

        // Staff cannot assign any roles
        if (!isAdmin && !isManager) {
          return res.status(403).json({
            error: "You don't have permission to assign roles",
          });
        }
      }

      // Remove all existing roles
      await prisma.customerRole.deleteMany({
        where: { customerId: userId },
      });

      // Assign new roles
      for (const roleName of rolesToAssign) {
        const role = await prisma.role.findUnique({
          where: { name: roleName.toLowerCase() },
        });

        if (role) {
          await prisma.customerRole.create({
            data: {
              customerId: userId,
              roleId: role.id,
            },
          });
        }
      }

      // Fetch updated user data
      const updatedUser = await prisma.customer.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found after update" });
      }

      res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        systemRoles: updatedUser.roles.map((r: any) => r.role.name),
      });
    } catch (error) {
      console.error("Error updating user roles:", error);
      res.status(500).json({ error: "Failed to update user roles" });
    }
  }
);

export default router;
