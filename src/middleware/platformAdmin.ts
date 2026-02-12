import { NextFunction, Request, Response } from "express";

export const isPlatformAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized - Please log in" });
  }

  const user = req.user as any;
  if (!user.isPlatformAdmin) {
    return res
      .status(403)
      .json({ error: "Forbidden - Platform admin access required" });
  }

  next();
};
