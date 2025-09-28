import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

// Firebase Admin SDK - simplified initialization
let admin: any = null;
console.warn("Firebase Admin SDK disabled for now - Google auth will not work server-side");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  stationId?: string;
  email?: string;
  isGoogleAuth?: boolean;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Generate JWT token
export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      stationId: user.stationId,
      isGoogleAuth: user.isGoogleAuth 
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

// Verify JWT token
export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      fullName: decoded.fullName || decoded.username,
      role: decoded.role,
      stationId: decoded.stationId,
      isGoogleAuth: decoded.isGoogleAuth || false
    };
  } catch (error) {
    return null;
  }
}

// Verify Firebase ID token
export async function verifyFirebaseToken(idToken: string): Promise<any | null> {
  if (!admin) {
    console.error("Firebase Admin SDK not available for token verification");
    return null;
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    return null;
  }
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: "No authorization header provided" });
  }

  const token = authHeader.startsWith("Bearer ") 
    ? authHeader.substring(7)
    : authHeader;

  const user = verifyToken(token);
  
  if (!user) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = user;
  next();
}

// Role-based authorization middleware
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

// Station access authorization middleware
export function requireStationAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const stationId = req.params.stationId || req.body.stationId;
  
  // Admin can access all stations
  if (req.user.role === "admin") {
    return next();
  }

  // Other users can only access their assigned station
  if (req.user.stationId && req.user.stationId !== stationId) {
    return res.status(403).json({ message: "Access denied to this station" });
  }

  next();
}