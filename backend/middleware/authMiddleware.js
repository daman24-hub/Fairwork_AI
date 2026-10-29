import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/jwt.js";
import User from "../models/User.js";

export async function protect(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication token is required." });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
    return next(error);
  }

  try {
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have access to this resource." });
    }

    next();
  };
}
