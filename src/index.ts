import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import https from "https";
import { Pool } from "pg";
import passport from "./config/passport";
import { tenantMiddleware } from "./middleware/tenantMiddleware";
import adminRoutes from "./routes/admin";
import adminCalendarRoutes from "./routes/admin-calendar";
import adminMembershipsRoutes from "./routes/admin-memberships";
import adminPunchPassesRoutes from "./routes/admin-punch-passes";
import authRoutes from "./routes/auth";
import calendarRoutes from "./routes/calendar";
import classesRoutes from "./routes/classes";
import membershipsRoutes from "./routes/memberships";
import openStudioRoutes from "./routes/open-studio";
import punchPassesRoutes from "./routes/punch-passes";
import productsRoutes from "./routes/products";
import registrationsRoutes from "./routes/registrations";
import reservationsRoutes from "./routes/reservations";
import resourcesRoutes from "./routes/resources";
import schedulePatternRoutes from "./routes/schedule-patterns";
import staffRoutes from "./routes/staff";
import staffReservationsRoutes from "./routes/staff-reservations";
import platformRoutes from "./routes/platform";
import stripeConnectRoutes from "./routes/stripe-connect";
import stripePaymentRoutes from "./routes/stripe-payment";
import stripeWebhookRoutes from "./routes/stripe-webhook";
import studioRoutes from "./routes/studio";
import teachingRolesRoutes from "./routes/teaching-roles";
import usersRoutes from "./routes/users";

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || "development"}` });

const app = express();

// Middleware
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      // Allow localhost and localhost subdomains (must return the exact origin for credentials)
      if (
        origin.match(/^http:\/\/localhost:\d+$/) ||
        origin.match(/^http:\/\/[\w-]+\.localhost:\d+$/)
      ) {
        return callback(null, origin);
      }

      // Allow configured CLIENT_URL
      if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
        return callback(null, origin);
      }

      // Allow kilnagent domains (dev, staging, production)
      if (
        origin.match(/^https:\/\/(www\.)?kilnagent-dev\.com$/) ||
        origin.match(/^https:\/\/[\w-]+\.kilnagent-dev\.com$/) ||
        origin.match(/^https:\/\/(www\.)?kilnagent-stage\.com$/) ||
        origin.match(/^https:\/\/[\w-]+\.kilnagent-stage\.com$/) ||
        origin.match(/^https:\/\/(www\.)?kilnagent\.com$/) ||
        origin.match(/^https:\/\/[\w-]+\.kilnagent\.com$/)
      ) {
        return callback(null, origin);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Stripe webhook - MUST come before express.json() to preserve raw body
app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookRoutes
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust Heroku proxy for secure cookies
// Required when running behind Heroku's load balancer to properly detect HTTPS
app.set("trust proxy", 1);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log(`  Origin: ${req.headers.origin || "none"}`);
  console.log(`  Cookies: ${req.headers.cookie ? "present" : "none"}`);
  if (req.headers.cookie) {
    console.log(`  Cookie value: ${req.headers.cookie.substring(0, 100)}`);
  }
  next();
});

// Session store configuration
const PgStore = connectPgSimple(session);

// For AWS RDS, we need to use their CA certificate bundle
// This certificate is publicly available and trusted
const AWS_RDS_CA_BUNDLE_URL = 'https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem';

let sslConfig: any = false;
if (process.env.NODE_ENV === "production") {
  // Use rejectUnauthorized: false as a fallback
  // AWS RDS certificates should be trusted, but some environments may need this
  sslConfig = { rejectUnauthorized: false };
}

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

// Session configuration
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// Determine cookie domain based on environment
let cookieDomain: string | undefined = undefined;
if (!isDevelopment) {
  // For deployed environments, set cookie domain from env var or detect from hostname
  cookieDomain = process.env.COOKIE_DOMAIN;

  // If not set, try to detect based on common patterns
  if (!cookieDomain) {
    const apiUrl = process.env.API_URL || "";
    if (apiUrl.includes("kilnagent-dev.com")) {
      cookieDomain = ".kilnagent-dev.com";
    } else if (apiUrl.includes("kilnagent-stage.com")) {
      cookieDomain = ".kilnagent-stage.com";
    } else if (apiUrl.includes("kilnagent.com")) {
      cookieDomain = ".kilnagent.com";
    }
  }
}

app.use(
  session({
    store: new PgStore({
      pool: pgPool,
      createTableIfMissing: true,
    }),
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: !isDevelopment, // Secure cookies for all deployed environments
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: !isDevelopment ? "none" : "lax", // "none" for cross-origin in deployed envs
      domain: cookieDomain, // Set domain for subdomain sharing in deployed envs
    },
  })
);

// Session logging middleware
app.use((req, res, next) => {
  console.log(`[Session Debug] ${req.method} ${req.path}`);
  console.log(`  Cookie header: ${req.headers.cookie ? "present" : "NONE"}`);
  console.log(`  Session ID: ${req.sessionID || "none"}`);
  const sessionUser = (req.session as { passport?: { user?: number } }).passport
    ?.user;
  console.log(`  Session user: ${sessionUser || "none"}`);
  console.log(`  Is authenticated: ${req.isAuthenticated?.() || false}`);
  next();
});

// Response header logging to debug cookie setting
app.use((req, res, next) => {
  const originalJson = res.json;
  const originalSend = res.send;

  res.json = function (data) {
    const setCookieHeader = res.getHeader("Set-Cookie");
    console.log(`[Response] ${req.method} ${req.path}`);
    console.log(
      `  Set-Cookie header: ${setCookieHeader ? JSON.stringify(setCookieHeader) : "NOT SET"}`
    );
    return originalJson.call(this, data);
  };

  res.send = function (data) {
    const setCookieHeader = res.getHeader("Set-Cookie");
    console.log(`[Response] ${req.method} ${req.path}`);
    console.log(
      `  Set-Cookie header: ${setCookieHeader ? JSON.stringify(setCookieHeader) : "NOT SET"}`
    );
    return originalSend.call(this, data);
  };

  next();
});

// Clear invalid session cookies (unsigned cookies from old deployments)
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader && cookieHeader.includes("connect.sid=")) {
    const cookies = cookieHeader.split(";");
    const sessionCookie = cookies.find((c) =>
      c.trim().startsWith("connect.sid=")
    );
    if (sessionCookie) {
      const cookieValue = sessionCookie.split("=")[1];
      // If cookie doesn't start with 's:' or 's%3A' (URL-encoded), it's unsigned/invalid
      if (
        cookieValue &&
        !cookieValue.startsWith("s:") &&
        !cookieValue.startsWith("s%3A")
      ) {
        console.log("[Session] Detected invalid unsigned cookie, clearing it");
        res.clearCookie("connect.sid", { path: "/" });
      }
    }
  }
  next();
});

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Multi-tenancy middleware - identifies studio from subdomain
app.use(tenantMiddleware);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/calendar", calendarRoutes); // Public calendar feeds
app.use("/api/products", productsRoutes);
app.use("/api/registrations", registrationsRoutes); // Customer registration
app.use("/api/reservations", reservationsRoutes); // Flexible reservation system
app.use("/api/stripe/connect", stripeConnectRoutes); // Stripe Connect onboarding
app.use("/api/stripe/payment", stripePaymentRoutes); // Stripe payment processing
app.use("/api/platform", platformRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/calendar", adminCalendarRoutes);
app.use("/api/admin/classes", classesRoutes);
app.use("/api/admin/memberships", adminMembershipsRoutes);
app.use("/api/admin/punch-passes", adminPunchPassesRoutes);
app.use("/api/admin/resources", resourcesRoutes);
app.use("/api/admin/schedule-patterns", schedulePatternRoutes);
app.use("/api/admin/teaching-roles", teachingRolesRoutes);
app.use("/api/admin/users", usersRoutes);
app.use("/api/memberships", membershipsRoutes);
app.use("/api/punch-passes", punchPassesRoutes);
app.use("/api/open-studio", openStudioRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/staff", staffReservationsRoutes); // Staff reservation management
app.use("/api/studio", studioRoutes);

// Example route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from API!" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
