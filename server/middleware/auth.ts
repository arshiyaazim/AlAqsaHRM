import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define a type for the user payload
interface UserPayload {
  id: number;
  email: string;
  role: string;
}

// Add user property to Request interface
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

// Middleware to verify the JWT token
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      
      req.user = user as UserPayload;
      next();
    });
  } else {
    res.status(401).json({ message: "Authentication token is required" });
  }
};

// Middleware to check user roles
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ message: "Insufficient permissions" });
    }
  };
};

// Generate JWT token
export const generateToken = (user: { id: number; email: string; role: string }) => {
  const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
  
  // Create a token that expires in 24 hours
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role 
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
};