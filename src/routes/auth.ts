import signature from "cookie-signature";
import { Router } from "express";
import passport from "../config/passport";
import { isAuthenticated } from "../middleware/auth";
import prisma from "../prisma";
import { hashPassword, validateEmail, validatePassword, buildCookieOptions } from "../utils/auth";
import crypto from "crypto";

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

// Register guest (from booking confirmation)
router.post("/register-guest", async (req, res) => {
  try {
    const { email, password, registrationId } = req.body;

    // Validate input
    if (!email || !password || !registrationId) {
      return res
        .status(400)
        .json({ error: "Email, password, and registrationId are required" });
    }

    // Get the studio from tenant middleware (if available)
    const studioId = (req as any).studioId;

    // Verify the registration exists and email matches
    const registration = await prisma.classRegistration.findUnique({
      where: { id: parseInt(registrationId) },
      include: {
        class: true,
      },
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Verify the email matches the guest email
    if (registration.guestEmail?.toLowerCase() !== email.toLowerCase()) {
      return res
        .status(400)
        .json({ error: "Email does not match registration" });
    }

    // Check if user already exists
    const existingUser = await prisma.customer.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res
        .status(400)
        .json({ error: passwordValidation.errors.join(", ") });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user account with guest info from registration
    const user = await prisma.customer.create({
      data: {
        name: registration.guestName || email.split("@")[0],
        email: email.toLowerCase(),
        passwordHash,
        phone: registration.guestPhone || null,
        agreedToTerms: true, // Guest implicitly agreed by booking
        agreedToSms: false,
      } as any,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Link the registration to the new customer account
    await prisma.classRegistration.update({
      where: { id: registration.id },
      data: {
        customerId: user.id,
      },
    });

    // Log the user in
    req.login(user, (err) => {
      if (err) {
        console.error("Login after guest registration failed:", err);
        return res.status(500).json({
          error: "Account created but login failed",
        });
      }

      // Save session before responding
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.status(500).json({ error: "Session save failed" });
        }

        // Build proper cookie options based on the request host
        const host = req.get("host") || "localhost";
        const cookieOptions = buildCookieOptions(req.sessionID, host);
        res.setHeader("Set-Cookie", cookieOptions);

        res.status(201).json({
          message: "Account created successfully",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            picture: user.picture,
            roles: user.roles?.map((r: any) => r.role?.name) || [],
            isPlatformAdmin: user.isPlatformAdmin || false,
          },
        });
      });
    });
  } catch (error) {
    console.error("Guest registration error:", error);
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

        // Build proper cookie options based on the request host
        const host = req.get("host") || "localhost";
        const cookieOptions = buildCookieOptions(req.sessionID, host);
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
            isPlatformAdmin: user.isPlatformAdmin || false,
          },
        });
      });
    });
  })(req, res, next);
});

// ========== Google OAuth ==========

router.get(
  "/google",
  (req, res, next) => {
    // Store returnUrl in session if provided
    if (req.query.returnUrl) {
      (req.session as any).returnUrl = req.query.returnUrl as string;
    }
    next();
  },
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

      const user = req.user as any;
      const needsCompletion = !user.agreedToTerms;

      // Check for returnUrl from session
      const returnUrl = (req.session as any).returnUrl;
      delete (req.session as any).returnUrl; // Clean up

      // If returning from guest linking flow, include OAuth data
      let redirectUrl = returnUrl 
        ? `${returnUrl}&provider=google&data=${encodeURIComponent(JSON.stringify({
            email: user.email,
            name: user.name,
            picture: user.picture,
            providerAccountId: user.id,
            accessToken: (req.user as any)._json?.access_token || '',
            refreshToken: (req.user as any)._json?.refresh_token || null,
            idToken: (req.user as any)._json?.id_token || null,
            expiresAt: null,
            scope: 'profile email'
          }))}`
        : needsCompletion
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
  (req, res, next) => {
    // Store returnUrl in session if provided
    if (req.query.returnUrl) {
      (req.session as any).returnUrl = req.query.returnUrl as string;
    }
    next();
  },
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

          // Check for returnUrl from session
          const returnUrl = (req.session as any).returnUrl;
          delete (req.session as any).returnUrl; // Clean up

          // If returning from guest linking flow, include OAuth data
          let redirectUrl = returnUrl
            ? `${returnUrl}&provider=apple&data=${encodeURIComponent(JSON.stringify({
                email: user.email,
                name: user.name,
                picture: user.picture,
                providerAccountId: user.id,
                accessToken: (user as any).accessToken || '',
                refreshToken: (user as any).refreshToken || null,
                idToken: (req.body.id_token) || null,
                expiresAt: null,
                scope: 'name email'
              }))}`
            : needsCompletion
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
    isPlatformAdmin: user.isPlatformAdmin || false,
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
    const host = req.get("host") || "localhost";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
    
    const clearCookies = [
      // Clear the default cookie (no domain for localhost)
      isLocalhost
        ? "connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
        : "connect.sid=; Path=/; Domain=.kilnagent.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
    ];

    console.log("[Clear Session] Setting clear-cookie headers:", clearCookies);
    res.setHeader("Set-Cookie", clearCookies);

    console.log("[Clear Session] Cookies cleared, redirecting to login");

    // Redirect back to login page
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    res.redirect(`${clientUrl}/login?cleared=true`);
  });
});

// ========== Password Recovery ==========

// Link OAuth account to guest registration
router.post("/link-oauth-to-guest", async (req, res) => {
  try {
    const { registrationId, provider, oauthData, linkExistingEmail } = req.body;

    if (!registrationId || !provider || !oauthData) {
      return res.status(400).json({
        error: "registrationId, provider, and oauthData are required",
      });
    }

    // Verify the registration exists
    const registration = await prisma.classRegistration.findUnique({
      where: { id: parseInt(registrationId) },
      include: { class: true },
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const oauthEmail = oauthData.email?.toLowerCase();
    const guestEmail = registration.guestEmail?.toLowerCase();

    if (!oauthEmail) {
      return res.status(400).json({
        error: `${provider === "apple" ? "Apple" : "Google"} account must have an email`,
      });
    }

    // Determine which email to use for the account
    const accountEmail = linkExistingEmail ? guestEmail : oauthEmail;

    if (!accountEmail) {
      return res.status(400).json({
        error: "No valid email found for account creation",
      });
    }

    // Check if user already exists
    let user = await prisma.customer.findFirst({
      where: { email: accountEmail },
      include: { accounts: true },
    });

    // If user doesn't exist, create account
    if (!user) {
      user = await prisma.customer.create({
        data: {
          name: oauthData.name || registration.guestName || accountEmail.split("@")[0],
          email: accountEmail,
          phone: registration.guestPhone || null,
          picture: oauthData.picture || null,
          agreedToTerms: true, // Guest implicitly agreed by booking
          agreedToSms: false,
          accounts: {
            create: {
              provider,
              providerAccountId: oauthData.providerAccountId,
              accessToken: oauthData.accessToken,
              refreshToken: oauthData.refreshToken || null,
              idToken: oauthData.idToken || null,
              expiresAt: oauthData.expiresAt || null,
              tokenType: "Bearer",
              scope: oauthData.scope || null,
            },
          },
        } as any,
        include: { accounts: true },
      });
    } else {
      // User exists, check if this OAuth provider is already linked
      const existingAccount = user.accounts.find(
        (acc: any) =>
          acc.provider === provider &&
          acc.providerAccountId === oauthData.providerAccountId
      );

      if (!existingAccount) {
        // Add new OAuth account to existing user
        await prisma.account.create({
          data: {
            customerId: user.id,
            provider,
            providerAccountId: oauthData.providerAccountId,
            accessToken: oauthData.accessToken,
            refreshToken: oauthData.refreshToken || null,
            idToken: oauthData.idToken || null,
            expiresAt: oauthData.expiresAt || null,
            tokenType: "Bearer",
            scope: oauthData.scope || null,
          },
        });
      }
    }

    // Link registration to customer account (if not already linked)
    if (registration.customerId !== user.id) {
      await prisma.classRegistration.update({
        where: { id: registration.id },
        data: { customerId: user.id },
      });
    }

    // Log the user in
    req.login(user, (err) => {
      if (err) {
        console.error("Login after OAuth linking failed:", err);
        return res.status(500).json({
          error: "Account linked but login failed",
        });
      }

      // Save session before responding
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.status(500).json({ error: "Session save failed" });
        }

        // Build proper cookie options based on the request host
        const host = req.get("host") || "localhost";
        const cookieOptions = buildCookieOptions(req.sessionID, host);
        res.setHeader("Set-Cookie", cookieOptions);

        res.status(200).json({
          message: "OAuth account linked successfully",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            picture: user.picture,
            roles: [],
          },
        });
      });
    });
  } catch (error) {
    console.error("OAuth linking error:", error);
    res.status(500).json({
      error: "Internal server error during account linking",
    });
  }
});

// ========== Password Recovery ==========

// Request password reset
router.post("/request-password-reset", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user by email (case-insensitive)
    const user = await prisma.customer.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // For security, don't reveal whether email exists
      // Return success either way
      return res.status(200).json({
        message: "If an account exists with that email, a reset link has been sent",
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token hash in database
    await prisma.customer.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: resetTokenExpires,
      } as any,
    });

    // TODO: Send email with reset link
    // For now, log the reset link for testing
    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/auth/password-reset?token=${resetToken}`;
    console.log(`[Password Reset] Reset link for ${email}: ${resetUrl}`);
    console.log(
      `[Password Reset] Token expires at: ${resetTokenExpires.toISOString()}`
    );

    // In production, send via email service (sendgrid, nodemailer, etc.)
    // Example:
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Password Reset Request',
    //   template: 'password-reset',
    //   data: {
    //     name: user.name,
    //     resetUrl,
    //     expiresIn: '1 hour'
    //   }
    // });

    res.status(200).json({
      message: "If an account exists with that email, a reset link has been sent",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({
      error: "Internal server error during password reset request",
    });
  }
});

// Reset password with token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ error: "Token and password are required" });
    }

    // Validate new password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res
        .status(400)
        .json({ error: passwordValidation.errors.join(", ") });
    }

    // Hash the token to match what's stored in database
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with matching reset token
    const user = await prisma.customer.findFirst({
      where: {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: {
          gt: new Date(), // Token must not be expired
        },
      } as any,
    });

    if (!user) {
      return res.status(400).json({
        error: "Password reset token is invalid or has expired",
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password and clear reset token
    await prisma.customer.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      } as any,
    });

    // TODO: Send confirmation email
    console.log(`[Password Reset] Password reset successful for ${user.email}`);

    res.status(200).json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      error: "Internal server error during password reset",
    });
  }
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
