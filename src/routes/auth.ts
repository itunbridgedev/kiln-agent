import { PrismaClient } from "@prisma/client";
import signature from "cookie-signature";
import { Router } from "express";
import passport from "../config/passport";
import { isAuthenticated } from "../middleware/auth";
import prisma from "../prisma";
import { hashPassword, validateEmail, validatePassword } from "../utils/auth";

const router = Router();

// ========== Email/Password Authentication ==========

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, agreedToTerms, agreedToSms } =
      req.body;

    // Validate input
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    // Convert agreedToTerms to boolean if it's a string
    const agreedToTermsBool =
      agreedToTerms === true || agreedToTerms === "true";

    if (!agreedToTermsBool) {
      return res
        .status(400)
        .json({ error: "You must agree to the Terms & Conditions" });
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
    const existingUser = await prisma.customer.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const agreedToSmsBool = agreedToSms === true || agreedToSms === "true";

    const user = await prisma.customer.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone || null,
        agreedToTerms: agreedToTermsBool,
        agreedToSms: agreedToSmsBool,
      } as any,
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
          roles: [],
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
  console.log("[Login] Received login request for:", req.body.email);

  passport.authenticate("local", (err: any, user: any, info: any) => {
    console.log("[Login] Passport authenticate callback");
    console.log("[Login] Error:", err);
    console.log("[Login] User:", user ? `Found user ${user.id}` : "No user");
    console.log("[Login] Info:", info);

    if (err) {
      console.error("[Login] Authentication error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!user) {
      console.log("[Login] Authentication failed:", info?.message);
      return res
        .status(401)
        .json({ error: info?.message || "Invalid credentials" });
    }
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }

      // Explicitly save the session to ensure cookie is set
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("[Login] Session save error:", saveErr);
          return res.status(500).json({ error: "Session save failed" });
        }

        console.log("[Login] Session saved successfully");
        console.log("[Login] Session ID:", req.sessionID);
        console.log("[Login] Session data:", JSON.stringify(req.session));

        // Manually set the Set-Cookie header since express-session isn't doing it
        const signature = require("cookie-signature");
        const secret =
          process.env.SESSION_SECRET || "your-secret-key-change-in-production";
        const signedSessionId = `s:${signature.sign(req.sessionID, secret)}`;

        const cookieOptions = [
          `connect.sid=${signedSessionId}`,
          `Domain=.kilnagent.com`,
          `Path=/`,
          `Expires=${new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString()}`,
          `HttpOnly`,
          `Secure`,
          `SameSite=None`,
        ].join("; ");

        res.setHeader("Set-Cookie", cookieOptions);
        console.log("[Login] Manually set cookie:", cookieOptions);

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
    // Save session before redirecting to ensure cookie is set
    req.session.save((err) => {
      if (err) {
        console.error("[Google Callback] Error saving session:", err);
        return res.redirect(
          `${process.env.CLIENT_URL || "http://localhost:3000"}/login?error=session_error`
        );
      }
      console.log(`[Google Callback] Session saved, redirecting`);
      console.log(`[Google Callback] Session ID: ${req.sessionID}`);
      console.log(
        `[Google Callback] Session cookie: ${JSON.stringify(req.session.cookie)}`
      );

      // Check if user needs to complete registration
      const user = req.user as any;
      const needsCompletion = !user.agreedToTerms;

      const redirectUrl = needsCompletion
        ? `${process.env.CLIENT_URL || "http://localhost:3000"}/complete-registration`
        : `${process.env.CLIENT_URL || "http://localhost:3000"}/`;

      // Manually set signed cookie header with correct domain
      const sessionSecret =
        process.env.SESSION_SECRET || "your-secret-key-change-in-production";
      const signedSessionId = `s:${signature.sign(req.sessionID, sessionSecret)}`;

      const cookieOptions = [
        `connect.sid=${signedSessionId}`,
        req.session.cookie.domain ? `Domain=${req.session.cookie.domain}` : "",
        `Path=${req.session.cookie.path || "/"}`,
        req.session.cookie.maxAge
          ? `Expires=${new Date(Date.now() + req.session.cookie.maxAge).toUTCString()}`
          : "",
        "HttpOnly",
        req.session.cookie.secure ? "Secure" : "",
        req.session.cookie.sameSite
          ? `SameSite=${req.session.cookie.sameSite}`
          : "",
      ]
        .filter(Boolean)
        .join("; ");

      console.log(`[Google Callback] Setting cookie: ${cookieOptions}`);

      res.setHeader("Set-Cookie", cookieOptions);
      res.redirect(302, redirectUrl);
    });
  }
);

// ========== Apple OAuth ==========

router.get(
  "/apple",
  passport.authenticate("apple", {
    scope: ["name", "email"],
  })
);

// Apple OAuth callback
router.post("/apple/callback", (req, res, next) => {
  console.log("[Apple Callback] Starting authentication");
  console.log(
    `[Apple Callback] Request body keys: ${Object.keys(req.body).join(", ")}`
  );
  console.log(`[Apple Callback] Has id_token: ${!!req.body.id_token}`);
  console.log(`[Apple Callback] Has code: ${!!req.body.code}`);
  console.log(`[Apple Callback] Has user: ${!!req.body.user}`);

  try {
    passport.authenticate("apple", (err: any, user: any, info: any) => {
      console.log("[Apple Callback] Passport callback invoked");
      console.log(
        `[Apple Callback] Error: ${err ? err.message || JSON.stringify(err) : "none"}`
      );
      console.log(
        `[Apple Callback] User: ${user ? JSON.stringify(user) : "none"}`
      );
      console.log(
        `[Apple Callback] Info: ${info ? JSON.stringify(info) : "none"}`
      );

      if (err) {
        console.error("[Apple Callback] Error during authentication:", err);
        console.error("[Apple Callback] Error stack:", err.stack);
        return res.redirect(
          `${process.env.CLIENT_URL || "http://localhost:3000"}/login?error=auth_error`
        );
      }

      if (!user) {
        console.error("[Apple Callback] No user returned from Apple");
        return res.redirect(
          `${process.env.CLIENT_URL || "http://localhost:3000"}/login?error=no_user`
        );
      }

      req.login(user, (err) => {
        if (err) {
          console.error("[Apple Callback] Error during login:", err);
          return res.redirect(
            `${process.env.CLIENT_URL || "http://localhost:3000"}/login?error=login_failed`
          );
        }

        console.log("[Apple Callback] Authentication successful");
        console.log(`[Apple Callback] User logged in: ${JSON.stringify(user)}`);
        console.log(`[Apple Callback] Session ID: ${req.sessionID}`);
        console.log(`[Apple Callback] Session: ${JSON.stringify(req.session)}`);
        console.log(
          `[Apple Callback] Cookie settings: ${JSON.stringify(req.session.cookie)}`
        );

        // Save session before redirecting to ensure cookie is set
        req.session.save((err) => {
          if (err) {
            console.error("[Apple Callback] Error saving session:", err);
            return res.redirect(
              `${process.env.CLIENT_URL || "http://localhost:3000"}/login?error=session_error`
            );
          }

          // Check if user needs to complete registration
          const needsCompletion = !(user as any).agreedToTerms;

          const redirectUrl = needsCompletion
            ? `${process.env.CLIENT_URL || "http://localhost:3000"}/complete-registration`
            : `${process.env.CLIENT_URL || "http://localhost:3000"}/`;

          console.log(
            `[Apple Callback] Session saved, redirecting to: ${redirectUrl}`
          );
          console.log(`[Apple Callback] Session ID: ${req.sessionID}`);
          console.log(
            `[Apple Callback] Session cookie: ${JSON.stringify(req.session.cookie)}`
          );

          // Manually set signed cookie header with correct domain
          const sessionSecret =
            process.env.SESSION_SECRET ||
            "your-secret-key-change-in-production";
          const signedSessionId = `s:${signature.sign(req.sessionID, sessionSecret)}`;

          const cookieOptions = [
            `connect.sid=${signedSessionId}`,
            req.session.cookie.domain
              ? `Domain=${req.session.cookie.domain}`
              : "",
            `Path=${req.session.cookie.path || "/"}`,
            req.session.cookie.maxAge
              ? `Expires=${new Date(Date.now() + req.session.cookie.maxAge).toUTCString()}`
              : "",
            "HttpOnly",
            req.session.cookie.secure ? "Secure" : "",
            req.session.cookie.sameSite
              ? `SameSite=${req.session.cookie.sameSite}`
              : "",
          ]
            .filter(Boolean)
            .join("; ");

          console.log(`[Apple Callback] Setting cookie: ${cookieOptions}`);

          res.setHeader("Set-Cookie", cookieOptions);
          res.redirect(302, redirectUrl);
        });
      });
    })(req, res, next);
  } catch (error) {
    console.error("[Apple Callback] Exception caught:", error);
    res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:3000"}/login?error=exception`
    );
  }
});

// Complete registration after OAuth (add phone and agreements)
router.post("/complete-registration", isAuthenticated, async (req, res) => {
  try {
    const { phone, agreedToTerms, agreedToSms } = req.body;
    const user = req.user as any;

    if (!agreedToTerms) {
      return res
        .status(400)
        .json({ error: "You must agree to the Terms & Conditions" });
    }

    // Update user with additional information
    const updatedUser = await prisma.customer.update({
      where: { id: user.id },
      data: {
        phone: phone || null,
        agreedToTerms: agreedToTerms || false,
        agreedToSms: agreedToSms || false,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    res.json({
      message: "Registration completed successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        picture: updatedUser.picture,
        roles: updatedUser.roles?.map((r: any) => r.role?.name) || [],
      },
    });
  } catch (error) {
    console.error("Complete registration error:", error);
    res
      .status(500)
      .json({ error: "Internal server error completing registration" });
  }
});

// Get current user
router.get("/me", isAuthenticated, (req, res) => {
  console.log("[/me] Request received");
  console.log(`[/me] Session ID: ${req.sessionID}`);
  console.log(`[/me] Is authenticated: ${req.isAuthenticated()}`);
  console.log(`[/me] User: ${JSON.stringify(req.user)}`);
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
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to destroy session" });
      }
      res.clearCookie("connect.sid", {
        path: "/",
        domain:
          process.env.NODE_ENV === "production" ? ".kilnagent.com" : undefined,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      res.json({ message: "Logged out successfully" });
    });
  });
});

// Clear session (for troubleshooting cookie issues)
router.get("/clear-session", (req, res) => {
  console.log("[Clear Session] Clearing all session cookies");

  req.session.destroy((err) => {
    if (err) {
      console.error("[Clear Session] Error destroying session:", err);
    }

    // Manually set both Set-Cookie headers to clear both cookies
    // Express's res.clearCookie() can only be called once per cookie name
    const clearCookies = [
      // Clear the www.kilnagent.com specific cookie
      "connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
      // Clear the legacy .kilnagent.com domain cookie
      "connect.sid=; Path=/; Domain=.kilnagent.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
    ];

    console.log("[Clear Session] Setting clear-cookie headers:", clearCookies);
    res.setHeader("Set-Cookie", clearCookies);

    console.log("[Clear Session] Cookies cleared, redirecting to login");

    // Redirect back to login page
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    res.redirect(`${clientUrl}/login?cleared=true`);
  });
});

// Check auth status
router.get("/status", (req, res) => {
  console.log("[/status] Request received");
  console.log(`[/status] Session ID: ${req.sessionID}`);
  console.log(`[/status] Is authenticated: ${req.isAuthenticated()}`);
  console.log(
    `[/status] Session passport: ${JSON.stringify((req.session as any).passport)}`
  );
  res.json({ authenticated: req.isAuthenticated() });
});

export default router;
