import { NextFunction, Request, Response } from "express";

export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // console.log(`[isAuthenticated] Checking auth for ${req.path}`);
  // console.log(`[isAuthenticated] Session ID: ${req.sessionID}`);
  // console.log(`[isAuthenticated] Is authenticated: ${req.isAuthenticated()}`);
  // console.log(
  //   `[isAuthenticated] Session passport: ${JSON.stringify((req.session as any).passport)}`
  // );

  if (req.isAuthenticated()) {
    // console.log(`[isAuthenticated] ✓ User is authenticated`);
    return next();
  }
  // console.log(`[isAuthenticated] ✗ User is NOT authenticated`);
  res.status(401).json({ error: "Unauthorized - Please log in" });
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized - Please log in" });
  }

  const user = req.user as any;
  const hasAdminRole = user.roles?.some((r: any) => r.role?.name === "admin");

  if (!hasAdminRole) {
    return res.status(403).json({ error: "Forbidden - Admin access required" });
  }

  next();
};
