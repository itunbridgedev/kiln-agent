import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import passport from "../config/passport";
import { isAuthenticated } from "../middleware/auth";
import { hashPassword, validateEmail, validatePassword } from "../utils/auth";

const router = Router();
const prisma = new PrismaClient();

// ========== Email/Password Authentication ==========

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res
        .status(400)
        .json({ error: passwordValidation.errors.join(", ") });
    }

    // Check if user already exists
    const existingUser = await prisma.customer.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.customer.create({
      data: {
        name,
        email,
        passwordHash,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Log the user in
    req.login(user, (err) => {
      if (err) {
        console.error("Login after registration failed:", err);
        return res
          .status(500)
          .json({ error: "Registration successful but login failed" });
      }
      res.status(201).json({
        message: "Registration successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture,
          roles: user.roles?.map((r) => r.role?.name) || [],
        },
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ error: "Internal server error during registration" });
  }
});

// Login with email/password
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!user) {
      return res
        .status(401)
        .json({ error: info?.message || "Invalid credentials" });
    }
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }
      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture,
          roles: user.roles?.map((r: any) => r.role?.name) || [],
        },
      });
    });
  })(req, res, next);
});

// ========== Google OAuth ==========

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/login?error=auth_failed`,
  }),
  (req, res) => {
    // Successful authentication, redirect to client
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/`);
  }
);

// Get current user
router.get("/me", isAuthenticated, (req, res) => {
  const user = req.user as any;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture,
    roles: user.roles?.map((r: any) => r.role?.name) || [],
  });
});

// Logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Check auth status
router.get("/status", (req, res) => {
  res.json({ authenticated: req.isAuthenticated() });
});

export default router;
