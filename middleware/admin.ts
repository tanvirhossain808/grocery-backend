import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { getAdminStatus } from "../utils/AdminEmailChecker.js";
const admin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });
    const isAdmin = getAdminStatus(user.email);
    if (isAdmin && req.user) {
      req.user.isAdmin = true;
      next();
    } else res.status(403).json({ message: "Admin access required" });
  } catch (error: any) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Admin verification failed", error: error.message });
  }
};
export default admin;
