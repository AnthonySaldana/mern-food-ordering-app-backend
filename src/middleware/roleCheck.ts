import { Request, Response, NextFunction } from "express";
import { UserRole } from "../models/user";

export const roleCheck = (requiredRoles: UserRole[]) => {
  return (req: Request & { userRole?: UserRole }, res: Response, next: NextFunction) => {
    if (!req.userRole || !requiredRoles.includes(req.userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};