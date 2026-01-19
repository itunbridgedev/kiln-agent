import { NextFunction, Request, Response } from "express";
import prisma from "../prisma";
import { clearStudioContext, setStudioContext } from "./tenant";

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract subdomain from hostname
    const hostname = req.hostname;
    let subdomain = "demo"; // Default for development
    let isRootDomain = false;

    // In production, extract subdomain
    if (process.env.NODE_ENV === "production") {
      const parts = hostname.split(".");
      if (parts.length === 2 && parts[1] === "com") {
        // Root domain (kilnagent.com) - no subdomain
        isRootDomain = true;
      } else if (parts.length >= 3) {
        subdomain = parts[0]; // e.g., "pottery-place" from "pottery-place.kilnagent.com"
      }
    } else {
      // In development, check for X-Studio-Subdomain header (for testing)
      const headerSubdomain = req.headers["x-studio-subdomain"] as string;
      if (headerSubdomain === "root" || headerSubdomain === "") {
        isRootDomain = true;
      } else if (headerSubdomain) {
        subdomain = headerSubdomain;
      }
    }

    // If root domain, skip tenant resolution (for marketing page)
    if (isRootDomain) {
      (req as any).isRootDomain = true;
      return next();
    }

    // Look up studio by subdomain
    const studio = await prisma.studio.findUnique({
      where: { subdomain },
    });

    if (!studio) {
      return res.status(404).json({ error: "Studio not found" });
    }

    if (!studio.isActive) {
      return res.status(403).json({ error: "Studio is not active" });
    }

    // Set studio context for this request
    setStudioContext(studio.id);

    // Store studio info in request for easy access
    (req as any).studio = studio;

    // Clear context after request completes
    res.on("finish", () => {
      clearStudioContext();
    });

    next();
  } catch (error) {
    console.error("[Tenant Middleware] Error:", error);
    clearStudioContext();
    res.status(500).json({ error: "Internal server error" });
  }
}
