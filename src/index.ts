import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import { Pool } from "pg";
import passport from "./config/passport";
import { tenantMiddleware } from "./middleware/tenantMiddleware";
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import classesRoutes from "./routes/classes";
import productsRoutes from "./routes/products";
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
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Session configuration
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
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      // Only set domain for production kilnagent.com, not for staging/dev Heroku URLs
      domain:
        process.env.NODE_ENV === "production" &&
        !process.env.HEROKU_APP_NAME?.includes("staging") &&
        !process.env.HEROKU_APP_NAME?.includes("dev")
          ? ".kilnagent.com"
          : undefined,
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
app.use("/api/products", productsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/classes", classesRoutes);
app.use("/api/admin/teaching-roles", teachingRolesRoutes);
app.use("/api/admin/users", usersRoutes);
app.use("/api/studio", studioRoutes);

// Example route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from API!" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
