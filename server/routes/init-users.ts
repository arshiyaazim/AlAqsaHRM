import { RequestHandler } from "express";
import { storage } from "../storage";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// Default users for the system
const DEFAULT_USERS = [
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
    employeeId: "ADMIN01",
    isActive: true
  },
  {
    firstName: "HR",
    lastName: "Manager",
    email: "hr@example.com",
    password: "hr1234",
    role: "hr",
    employeeId: "HR002",
    isActive: true
  },
  {
    firstName: "View",
    lastName: "Only",
    email: "viewer@example.com",
    password: "view789",
    role: "viewer",
    employeeId: "VIEW003",
    isActive: true
  }
];

/**
 * Initialize default users if they don't exist
 * This ensures the system always has the default users available
 */
export const initializeDefaultUsers: RequestHandler = async (req, res) => {
  try {
    console.log("Initializing default users...");
    const results = [];

    for (const user of DEFAULT_USERS) {
      // Check if user exists
      const existingUser = await storage.getUserByEmail(user.email);
      
      if (existingUser) {
        results.push(`User ${user.email} already exists`);
        continue;
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      
      // Create the user
      const fullName = `${user.firstName} ${user.lastName}`;
      const newUser = await storage.createUser({
        firstName: user.firstName,
        lastName: user.lastName,
        fullName,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        employeeId: user.employeeId,
        isActive: user.isActive,
        permissions: {}
      });
      
      results.push(`Created user: ${newUser.email} with role: ${newUser.role}`);
    }
    
    return res.json({
      success: true,
      message: "Default users initialized",
      results
    });
  } catch (error) {
    console.error("Error initializing default users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initialize default users",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};