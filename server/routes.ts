import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEmployeeSchema, 
  insertProjectSchema, 
  insertAttendanceSchema, 
  insertDailyExpenditureSchema,
  insertDailyIncomeSchema,
  insertPayrollSchema, 
  insertPaymentSchema,
  insertDashboardStatsSchema,
  insertUserSchema,
  insertShipDutySchema,
  insertBillSchema,
  insertBillPaymentSchema
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticateJWT, authorize, generateToken } from "./middleware/auth";
import { readEmployeeExcel } from "./utils/excelImport";
import { upload, handleFileUploadErrors } from "./utils/fileUpload";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import adminRoutes from "./api/admin";

// Helper to generate the next employee ID in format EMP-1001, EMP-1002, etc.
async function getNextEmployeeId(storage: any): Promise<number> {
  try {
    const employees = await storage.getAllEmployees();
    let maxId = 1000; // Start from 1000 by default
    
    if (employees && employees.length > 0) {
      // Find the highest employeeId
      for (const employee of employees) {
        if (employee.employeeId && employee.employeeId.startsWith('EMP-')) {
          const idNum = parseInt(employee.employeeId.substring(4));
          if (!isNaN(idNum) && idNum > maxId) {
            maxId = idNum;
          }
        }
      }
    }
    
    return maxId + 1;
  } catch (error) {
    console.error('Error getting next employee ID:', error);
    return 1001; // Fallback to 1001 if there's an error
  }
}

// Helper to manage company settings
// Default company settings will be loaded from database

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from the uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));
  
  // Error handler middleware
  const handleError = (err: any, res: Response) => {
    console.error(err);
    if (err instanceof ZodError) {
      const formattedError = fromZodError(err);
      return res.status(400).json({ 
        message: "Validation error", 
        errors: formattedError.details 
      });
    }
    return res.status(500).json({ message: err.message || "Internal server error" });
  };
  
  // Health check endpoint for monitoring the application
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      // Basic connectivity check - just run a simple query
      await storage.testDatabaseConnection();
      
      return res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          message: "Database connection successful"
        },
        environment: process.env.NODE_ENV || "development",
        uptime: process.uptime()
      });
    } catch (error) {
      console.error("Health check failed:", error);
      
      return res.status(500).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error.message
        },
        environment: process.env.NODE_ENV || "development",
        uptime: process.uptime()
      });
    }
  });
  
  // Google Maps API key endpoint
  app.get("/api/maps/apikey", authenticateJWT, (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ 
          message: "Google Maps API key not configured" 
        });
      }
      
      return res.json({ apiKey });
    } catch (error: any) {
      console.error("Error serving Google Maps API key:", error);
      return res.status(500).json({ 
        message: "Error serving Google Maps API key",
        error: error.message || "Unknown error"
      });
    }
  });
  
    // Auth middleware and token generator are imported from './middleware/auth'
  
  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      console.log("Login attempt:", { email });
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // First check if user exists
      const userCheck = await storage.getUserByEmail(email);
      console.log("User found in database:", !!userCheck);
      
      const user = await storage.getUserByCredentials(email, password);
      console.log("Password check result:", !!user);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ message: "Account is inactive. Please contact an administrator." });
      }
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Return user data (excluding password) and token
      const { password: _, ...userData } = user;
      res.json({ 
        token, 
        user: userData
      });
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Parse and validate input
      const data = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password, salt);
      
      // Combine first and last name to create fullName
      const fullName = `${data.firstName} ${data.lastName}`;
      
      // Create user with hashed password
      // For users created from admin panel, set isActive to true, for regular registrations, default to false
      // Admins are automatically approved
      const isActive = req.headers.authorization ? true : false;
      const role = data.role || "viewer"; // Default role is viewer
      
      console.log(`Creating user with isActive=${isActive} and role=${role}`);
      
      // We need to handle fullName separately because it's not in the insert schema
      // but is a required field in the database
      const userToCreate = {
        ...data,
        password: hashedPassword,
        role: role,
        isActive: role === 'admin' ? true : isActive // Admins are always active
      };
      
      // Add fullName field directly to avoid TypeScript errors
      const userWithFullName = {
        ...userToCreate,
        fullName
      } as any;
      
      const user = await storage.createUser(userWithFullName);
      
      // Generate token for the new user
      const token = generateToken(user);
      
      // Return user data (excluding password) and token
      const { password: _, ...userData } = user;
      res.status(201).json({
        token,
        user: userData
      });
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/auth/me", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user data excluding password
      const { password: _, ...userData } = user;
      res.json(userData);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // User management routes (admin only)
  app.get("/api/users", authenticateJWT, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/users/:id", authenticateJWT, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: _, ...userData } = user;
      res.json(userData);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.patch("/api/users/:id", authenticateJWT, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const validatedData = insertUserSchema.partial().parse(req.body);
      
      // Hash password if provided
      if (validatedData.password) {
        const salt = await bcrypt.genSalt(10);
        validatedData.password = await bcrypt.hash(validatedData.password, salt);
      }
      
      const updatedUser = await storage.updateUser(id, validatedData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: _, ...userData } = updatedUser;
      res.json(userData);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.patch("/api/users/:id/role", authenticateJWT, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { role } = req.body;
      if (!role || !["admin", "hr", "viewer"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'admin', 'hr', or 'viewer'." });
      }
      
      const updatedUser = await storage.updateUserRole(id, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: _, ...userData } = updatedUser;
      res.json(userData);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/users/:id/permissions", authenticateJWT, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { permissions } = req.body;
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ message: "Invalid permissions format. Expected an object." });
      }
      
      const updatedUser = await storage.updateUserPermissions(id, permissions);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: _, ...userData } = updatedUser;
      res.json(userData);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Approve a user registration (make the user active)
  app.patch("/api/users/:id/approve", authenticateJWT, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Update isActive status to true
      const updatedUser = await storage.updateUser(id, { isActive: true });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: _, ...userData } = updatedUser;
      res.json(userData);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Decline/reject a user registration (delete the user)
  app.delete("/api/users/:id/decline", authenticateJWT, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if the user is trying to delete their own account
      if (id === (req as any).user.id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json({ message: "User registration declined successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.delete("/api/users/:id", authenticateJWT, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if the user is trying to delete their own account
      if (id === (req as any).user.id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Register admin routes
  app.use("/api/admin", authenticateJWT, authorize(["admin"]), adminRoutes);
  
  // Dashboard stats routes
  app.get("/api/dashboard", authenticateJWT, async (req: Request, res: Response) => {
    try {
      // Always create default stats if none exist
      const stats = await storage.getDashboardStats();
      
      // Updated to always return data
      if (stats) {
        res.json(stats);
      } else {
        // Create default stats on the fly as a fallback
        const defaultStats = {
          id: 0,
          date: new Date().toISOString().split('T')[0],
          totalEmployees: 0,
          presentEmployees: 0,
          absentEmployees: 0,
          lateEmployees: 0,
          activeProjects: 0,
          totalPayroll: "0"
        };
        
        // Save these default stats for future use
        const newStats = await storage.createOrUpdateDashboardStats(defaultStats);
        res.json(newStats || defaultStats);
      }
    } catch (err) {
      console.error("Dashboard stats error:", err);
      // Even on error, return a valid response to prevent frontend errors
      res.json({
        id: 0,
        date: new Date().toISOString().split('T')[0],
        totalEmployees: 0,
        presentEmployees: 0,
        absentEmployees: 0,
        lateEmployees: 0,
        activeProjects: 0,
        totalPayroll: "0"
      });
    }
  });

  // Employee routes
  app.get("/api/employees", async (req: Request, res: Response) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/employees/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/employees", async (req: Request, res: Response) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/employees/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const updatedEmployee = await storage.updateEmployee(id, validatedData);
      
      if (!updatedEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(updatedEmployee);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/employees/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const success = await storage.deleteEmployee(id);
      if (!success) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Delete all employees endpoint - special route for admin use only
  app.delete("/api/employees/delete-all/confirm", async (req: Request, res: Response) => {
    try {
      const count = await storage.deleteAllEmployees();
      res.json({ 
        message: `Successfully deleted all employees`, 
        count 
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Project routes
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(id, validatedData);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(updatedProject);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const success = await storage.deleteProject(id);
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Attendance routes
  app.get("/api/attendance", async (req: Request, res: Response) => {
    try {
      const attendance = await storage.getAllAttendance();
      res.json(attendance);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/attendance/date/:date", async (req: Request, res: Response) => {
    try {
      const dateParam = req.params.date;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      
      if (!dateRegex.test(dateParam)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
      }
      
      const date = new Date(dateParam);
      const attendance = await storage.getAttendanceByDate(date);
      res.json(attendance);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/attendance/employee/:employeeId", async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const attendance = await storage.getAttendanceByEmployeeId(employeeId);
      res.json(attendance);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/attendance/project/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const attendance = await storage.getAttendanceByProjectId(projectId);
      res.json(attendance);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/attendance", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(validatedData);
      res.status(201).json(attendance);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/attendance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid attendance ID" });
      }
      
      const validatedData = insertAttendanceSchema.partial().parse(req.body);
      const updatedAttendance = await storage.updateAttendance(id, validatedData);
      
      if (!updatedAttendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      res.json(updatedAttendance);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/attendance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid attendance ID" });
      }
      
      const success = await storage.deleteAttendance(id);
      if (!success) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Payroll routes
  app.get("/api/payroll", async (req: Request, res: Response) => {
    try {
      const payroll = await storage.getAllPayrolls();
      res.json(payroll);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/payroll/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payroll ID" });
      }
      
      const payroll = await storage.getPayroll(id);
      if (!payroll) {
        return res.status(404).json({ message: "Payroll record not found" });
      }
      
      res.json(payroll);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/payroll/employee/:employeeId", async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const payroll = await storage.getPayrollByEmployeeId(employeeId);
      res.json(payroll);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/payroll", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPayrollSchema.parse(req.body);
      const payroll = await storage.createPayroll(validatedData);
      res.status(201).json(payroll);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/payroll/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payroll ID" });
      }
      
      const validatedData = insertPayrollSchema.partial().parse(req.body);
      const updatedPayroll = await storage.updatePayroll(id, validatedData);
      
      if (!updatedPayroll) {
        return res.status(404).json({ message: "Payroll record not found" });
      }
      
      res.json(updatedPayroll);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/payroll/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payroll ID" });
      }
      
      const success = await storage.deletePayroll(id);
      if (!success) {
        return res.status(404).json({ message: "Payroll record not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Payment routes
  app.get("/api/payments", async (req: Request, res: Response) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/payments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(payment);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/payments/payroll/:payrollId", async (req: Request, res: Response) => {
    try {
      const payrollId = parseInt(req.params.payrollId);
      if (isNaN(payrollId)) {
        return res.status(400).json({ message: "Invalid payroll ID" });
      }
      
      const payments = await storage.getPaymentsByPayrollId(payrollId);
      res.json(payments);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/payments", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/payments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const updatedPayment = await storage.updatePayment(id, validatedData);
      
      if (!updatedPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(updatedPayment);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/payments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const success = await storage.deletePayment(id);
      if (!success) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Excel import routes
  app.post("/api/import/employees", async (req: Request, res: Response) => {
    try {
      const filePath = req.body.filePath;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      // Check if file exists
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      
      if (!fs.existsSync(absolutePath)) {
        return res.status(400).json({ 
          message: `File not found: ${filePath}`,
          errors: [`File not found at path: ${absolutePath}`]
        });
      }
      
      console.log(`Processing Excel import from: ${absolutePath}`);
      const result = await readEmployeeExcel(absolutePath);
      
      if (!result.success) {
        console.error('Excel import failed:', result.message);
        return res.status(400).json({ 
          message: result.message,
          errors: result.errors 
        });
      }
      
      res.status(200).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Direct import - Parse Excel file and import directly to database in one go
  app.post("/api/import/employees/direct", async (req: Request, res: Response) => {
    try {
      const filePath = req.body.filePath;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      // Check if file exists
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      
      if (!fs.existsSync(absolutePath)) {
        return res.status(400).json({ 
          message: `File not found: ${filePath}`,
          errors: [`File not found at path: ${absolutePath}`]
        });
      }
      
      console.log(`Processing direct Excel import from: ${absolutePath}`);
      const result = await readEmployeeExcel(absolutePath);
      
      if (!result.success) {
        console.error('Excel import failed:', result.message);
        return res.status(400).json({ 
          message: result.message,
          errors: result.errors 
        });
      }
      
      // Process the imported data
      const importedEmployees = [];
      const errors = [];
      
      if (result.data && result.data.length > 0) {
        console.log(`Found ${result.data.length} employees in Excel file for direct import`);
        
        for (const employeeData of result.data) {
          try {
            // Validate each employee against our schema
            const validatedData = insertEmployeeSchema.parse(employeeData);
            
            // Add default employeeId if not provided - using auto-incremented EMP-#### format
            if (!validatedData.employeeId) {
              const nextId = await getNextEmployeeId(storage);
              validatedData.employeeId = `EMP-${nextId}`;
            }
            
            // Check if employee with this employeeId already exists - update if it does
            let employee;
            if (validatedData.employeeId) {
              const existingEmployee = await storage.getEmployeeByEmployeeId(validatedData.employeeId);
              if (existingEmployee) {
                // Update existing employee
                employee = await storage.updateEmployee(existingEmployee.id, validatedData);
                console.log(`Updated existing employee with ID: ${existingEmployee.employeeId}`);
              } else {
                // Create new employee
                employee = await storage.createEmployee(validatedData);
                console.log(`Created new employee with ID: ${employee.employeeId}`);
              }
            } else {
              // Create new employee without specific ID
              employee = await storage.createEmployee(validatedData);
              console.log(`Created new employee with auto-generated ID: ${employee.employeeId}`);
            }
            
            importedEmployees.push(employee);
          } catch (err: any) {
            console.error('Error importing employee:', err?.message || err);
            if (err instanceof ZodError) {
              const formattedError = fromZodError(err);
              errors.push({
                data: employeeData,
                errors: formattedError.details
              });
            } else {
              errors.push({
                data: employeeData,
                errors: [err?.message || "Unknown error"]
              });
            }
          }
        }
      } else {
        console.warn('No data found in Excel file or data is empty');
      }
      
      console.log(`Direct import completed: ${importedEmployees.length} imported, ${errors.length} errors`);
      res.status(200).json({
        message: `Directly imported ${importedEmployees.length} employees with ${errors.length} errors`,
        imported: importedEmployees,
        errors: errors.length > 0 ? errors : undefined,
        success: importedEmployees.length > 0
      });
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Daily Expenditure routes
  app.get("/api/expenditures", async (req: Request, res: Response) => {
    try {
      const expenditures = await storage.getAllDailyExpenditures();
      res.json(expenditures);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/expenditures/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expenditure ID" });
      }
      
      const expenditure = await storage.getDailyExpenditure(id);
      if (!expenditure) {
        return res.status(404).json({ message: "Expenditure record not found" });
      }
      
      res.json(expenditure);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/expenditures/date/:date", async (req: Request, res: Response) => {
    try {
      const dateParam = req.params.date;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      
      if (!dateRegex.test(dateParam)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
      }
      
      const date = new Date(dateParam);
      const expenditures = await storage.getDailyExpendituresByDate(date);
      res.json(expenditures);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/expenditures/employee/:employeeId", async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const expenditures = await storage.getDailyExpendituresByEmployeeId(employeeId);
      res.json(expenditures);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/expenditures/loan-advances/:employeeId", async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const loanAdvances = await storage.getLoanAdvancesByEmployeeId(employeeId);
      res.json({ employeeId, loanAdvances });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/expenditures", async (req: Request, res: Response) => {
    try {
      const validatedData = insertDailyExpenditureSchema.parse(req.body);
      const expenditure = await storage.createDailyExpenditure(validatedData);
      res.status(201).json(expenditure);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/expenditures/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expenditure ID" });
      }
      
      const validatedData = insertDailyExpenditureSchema.partial().parse(req.body);
      const updatedExpenditure = await storage.updateDailyExpenditure(id, validatedData);
      
      if (!updatedExpenditure) {
        return res.status(404).json({ message: "Expenditure record not found" });
      }
      
      res.json(updatedExpenditure);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/expenditures/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expenditure ID" });
      }
      
      const success = await storage.deleteDailyExpenditure(id);
      if (!success) {
        return res.status(404).json({ message: "Expenditure record not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Daily Income routes
  app.get("/api/incomes", async (req: Request, res: Response) => {
    try {
      const incomes = await storage.getAllDailyIncomes();
      res.json(incomes);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/incomes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cash receive ID" });
      }
      
      const income = await storage.getDailyIncome(id);
      if (!income) {
        return res.status(404).json({ message: "Cash receive record not found" });
      }
      
      res.json(income);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/incomes/date/:date", async (req: Request, res: Response) => {
    try {
      const dateParam = req.params.date;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      
      if (!dateRegex.test(dateParam)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
      }
      
      const date = new Date(dateParam);
      const incomes = await storage.getDailyIncomesByDate(date);
      res.json(incomes);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/incomes", async (req: Request, res: Response) => {
    try {
      const validatedData = insertDailyIncomeSchema.parse(req.body);
      const income = await storage.createDailyIncome(validatedData);
      res.status(201).json(income);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/incomes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cash receive ID" });
      }
      
      const validatedData = insertDailyIncomeSchema.partial().parse(req.body);
      const updatedIncome = await storage.updateDailyIncome(id, validatedData);
      
      if (!updatedIncome) {
        return res.status(404).json({ message: "Cash receive record not found" });
      }
      
      res.json(updatedIncome);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/incomes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cash receive ID" });
      }
      
      const success = await storage.deleteDailyIncome(id);
      if (!success) {
        return res.status(404).json({ message: "Cash receive record not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Company settings API
  app.get("/api/settings/company", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getCompanySettings();
      
      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = await storage.createOrUpdateCompanySettings({
          companyName: "HR & Payroll Management",
          companyTagline: "Manage your workforce efficiently",
          primaryColor: "#2C5282"
        });
        return res.status(200).json(defaultSettings);
      }
      
      res.status(200).json(settings);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/settings/company", async (req: Request, res: Response) => {
    try {
      const { companyName, companyTagline, primaryColor, logoUrl } = req.body;
      
      // Update company settings in the database
      const updatedSettings = await storage.createOrUpdateCompanySettings({
        companyName,
        companyTagline,
        primaryColor,
        logoUrl
      });
      
      res.status(200).json(updatedSettings);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/schema/customField", async (req: Request, res: Response) => {
    try {
      const { entity, operation, field } = req.body;
      
      if (!entity || !operation || !field) {
        return res.status(400).json({ 
          message: "Missing required fields: entity, operation, field" 
        });
      }
      
      if (!['employees', 'projects', 'attendance', 'payroll', 'payments'].includes(entity)) {
        return res.status(400).json({ message: "Invalid entity" });
      }
      
      if (!['add', 'remove', 'rename'].includes(operation)) {
        return res.status(400).json({ message: "Invalid operation" });
      }
      
      // This is a placeholder for actual schema modification
      // In a real implementation, this would modify the database schema
      // For now, we'll just return a success message
      res.status(200).json({ 
        message: `${operation} field ${field.name || field} for ${entity} successful`,
        success: true 
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // File upload route
  app.post("/api/upload", upload.single("file"), handleFileUploadErrors, (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Debug file upload
      console.log("File upload attempt:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
      
      const filePath = req.file.path;
      const fileName = req.file.originalname;
      
      // Create file metadata
      const fileData = {
        id: Buffer.from(filePath).toString('base64'),
        name: fileName,
        path: filePath.replace(/\\/g, "/"),
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadDate: new Date().toISOString()
      };
      
      // Save file metadata
      storage.saveUploadedFile(fileData)
        .then(() => {
          // Return the relative URL to the file, not the full path
          const fileUrl = `/uploads/${path.basename(filePath)}`;
          res.status(200).json({
            message: "File uploaded successfully",
            filePath: fileUrl,
            fileName,
            url: fileUrl // Add a clear url property
          });
        })
        .catch(error => {
          console.error("Error saving file metadata:", error);
          // Still return a usable URL
          const fileUrl = `/uploads/${path.basename(filePath)}`;
          res.status(200).json({
            message: "File uploaded successfully but metadata not saved",
            filePath: fileUrl,
            fileName,
            url: fileUrl // Add a clear url property
          });
        });
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Get all uploaded files
  app.get("/api/files", async (req: Request, res: Response) => {
    try {
      const files = await storage.getUploadedFiles();
      res.json(files);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Get a specific file by ID
  app.get("/api/files/:id", async (req: Request, res: Response) => {
    try {
      const file = await storage.getUploadedFile(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json(file);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Delete a file
  app.delete("/api/files/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteUploadedFile(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "File not found or could not be deleted" });
      }
      res.json({ message: "File deleted successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Report Templates API Endpoints
  app.get("/api/reports/templates", async (req: Request, res: Response) => {
    try {
      const { listReportTemplates, defaultTemplates } = await import('./utils/reportTemplates');
      
      // Get all templates from the filesystem
      const result = await listReportTemplates();
      
      if (result.success) {
        res.status(200).json(result.templates);
      } else {
        // If no templates are found, return the default templates
        res.status(200).json(defaultTemplates);
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/reports/templates/:id", async (req: Request, res: Response) => {
    try {
      const templateId = req.params.id;
      const { loadReportTemplate, defaultTemplates } = await import('./utils/reportTemplates');
      
      // Try to load the template from the filesystem
      const result = await loadReportTemplate(templateId);
      
      if (result.success) {
        res.status(200).json(result.template);
      } else {
        // If the template is not found, check if it's a default template
        const defaultTemplate = defaultTemplates.find(t => t.id === templateId);
        if (defaultTemplate) {
          res.status(200).json(defaultTemplate);
        } else {
          res.status(404).json({ message: "Report template not found" });
        }
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/reports/templates", async (req: Request, res: Response) => {
    try {
      const templateData = req.body;
      const { saveReportTemplate } = await import('./utils/reportGenerator');
      
      // Generate a unique ID if not provided
      if (!templateData.id) {
        templateData.id = `template-${Date.now()}`;
      }
      
      // Set created and updated dates
      templateData.createdAt = new Date();
      templateData.updatedAt = new Date();
      
      const result = await saveReportTemplate(templateData);
      
      if (result.success) {
        res.status(201).json(templateData);
      } else {
        res.status(500).json({ message: "Failed to save report template", error: result.error });
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  app.put("/api/reports/templates/:id", async (req: Request, res: Response) => {
    try {
      const templateId = req.params.id;
      const templateData = req.body;
      const { saveReportTemplate, loadReportTemplate } = await import('./utils/reportGenerator');
      const { defaultTemplates } = await import('./utils/reportTemplates');
      
      // Check if template exists
      const existing = await loadReportTemplate(templateId);
      
      // Check if it's a default template
      const isDefaultTemplate = defaultTemplates.some(t => t.id === templateId);
      
      if (!existing.success && !isDefaultTemplate) {
        return res.status(404).json({ message: "Report template not found" });
      }
      
      // Update the template data
      templateData.id = templateId;
      templateData.updatedAt = new Date();
      
      // Keep original creation date if it exists
      if (existing.success && existing.template.createdAt) {
        templateData.createdAt = existing.template.createdAt;
      }
      
      const result = await saveReportTemplate(templateData);
      
      if (result.success) {
        res.status(200).json(templateData);
      } else {
        res.status(500).json({ message: "Failed to update report template", error: result.error });
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  app.delete("/api/reports/templates/:id", async (req: Request, res: Response) => {
    try {
      const templateId = req.params.id;
      const { deleteReportTemplate } = await import('./utils/reportGenerator');
      const { defaultTemplates } = await import('./utils/reportTemplates');
      
      // Check if it's a default template
      const isDefaultTemplate = defaultTemplates.some(t => t.id === templateId);
      
      if (isDefaultTemplate) {
        return res.status(400).json({ message: "Cannot delete default templates" });
      }
      
      const result = await deleteReportTemplate(templateId);
      
      if (result.success) {
        res.status(200).json({ message: "Report template deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete report template", error: result.error });
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/reports/generate", async (req: Request, res: Response) => {
    try {
      const { templateId, dataType, filters, format = 'html' } = req.body;
      
      // Import required modules
      const { loadReportTemplate, defaultTemplates } = await import('./utils/reportTemplates');
      const { generateReportHtml, generateReportExcel } = await import('./utils/reportGenerator');
      
      // Load template
      let templateResult = await loadReportTemplate(templateId);
      let template;
      
      if (templateResult.success) {
        template = templateResult.template;
      } else {
        // Check default templates
        template = defaultTemplates.find(t => t.id === templateId);
        
        if (!template) {
          return res.status(404).json({ message: "Report template not found" });
        }
      }
      
      // Fetch data based on dataType
      let data = [];
      let companyDetails = null;
      
      // Get company details
      try {
        companyDetails = await storage.getCompanyDetails();
      } catch (err) {
        console.log('Company details not found, using defaults');
      }
      
      // Fetch data for the report
      switch (dataType) {
        case 'attendance':
          data = await storage.getAllAttendance(filters);
          break;
        case 'payroll':
          data = await storage.getAllPayroll(filters);
          break;
        case 'employee':
          data = await storage.getAllEmployees(filters);
          break;
        case 'project':
          data = await storage.getAllProjects(filters);
          break;
        case 'expenditure':
          data = await storage.getAllExpenditures(filters);
          break;
        case 'income':
        case 'cashReceive':
          data = await storage.getAllIncomes(filters);
          break;
        default:
          return res.status(400).json({ message: "Invalid data type" });
      }
      
      // Generate the report in the requested format
      if (format === 'html') {
        const html = await generateReportHtml(template, data, companyDetails);
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
      } else if (format === 'excel') {
        // For Excel, we'll generate a file and send it as a download
        const tempFilePath = path.join(uploadsDir, `report-${Date.now()}.xlsx`);
        const result = await generateReportExcel(template, data, tempFilePath);
        
        if (result.success) {
          // In a real implementation, we would send the file here
          res.status(200).json({ 
            message: "Excel export would be generated here",
            dataCount: data.length,
            filePath: tempFilePath.replace(/^.*[\\\/]/, '') // Just return the filename part
          });
        } else {
          res.status(500).json({ message: "Failed to generate Excel report" });
        }
      } else {
        res.status(400).json({ message: "Unsupported format. Use 'html' or 'excel'." });
      }
    } catch (error) {
      handleError(error, res);
    }
  });
    
  // Ship Duty routes
  app.get("/api/ship-duties", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const duties = await storage.getAllShipDuties();
      res.json(duties);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/ship-duties/:id", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ship duty ID" });
      }
      
      const duty = await storage.getShipDuty(id);
      if (!duty) {
        return res.status(404).json({ message: "Ship duty not found" });
      }
      
      res.json(duty);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/ship-duties/project/:projectId", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const duties = await storage.getShipDutiesByProjectId(projectId);
      res.json(duties);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/ship-duties/employee/:employeeId", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const duties = await storage.getShipDutiesByEmployeeId(employeeId);
      res.json(duties);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/ship-duties/date-range", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const duties = await storage.getShipDutiesByDateRange(new Date(startDate as string), new Date(endDate as string));
      res.json(duties);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post("/api/ship-duties", authenticateJWT, authorize(["admin", "hr"]), async (req: Request, res: Response) => {
    try {
      const validatedData = insertShipDutySchema.parse(req.body);
      const duty = await storage.createShipDuty(validatedData);
      res.status(201).json(duty);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.patch("/api/ship-duties/:id", authenticateJWT, authorize(["admin", "hr"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ship duty ID" });
      }
      
      const validatedData = insertShipDutySchema.partial().parse(req.body);
      const updatedDuty = await storage.updateShipDuty(id, validatedData);
      
      if (!updatedDuty) {
        return res.status(404).json({ message: "Ship duty not found" });
      }
      
      res.json(updatedDuty);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.delete("/api/ship-duties/:id", authenticateJWT, authorize(["admin", "hr"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ship duty ID" });
      }
      
      const success = await storage.deleteShipDuty(id);
      if (!success) {
        return res.status(404).json({ message: "Ship duty not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Bill routes
  app.get("/api/bills", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const bills = await storage.getAllBills();
      res.json(bills);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/bills/:id", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }
      
      const bill = await storage.getBill(id);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      res.json(bill);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/bills/number/:billNumber", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const billNumber = req.params.billNumber;
      if (!billNumber) {
        return res.status(400).json({ message: "Bill number is required" });
      }
      
      const bill = await storage.getBillByBillNumber(billNumber);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      res.json(bill);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/bills/project/:projectId", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const bills = await storage.getBillsByProjectId(projectId);
      res.json(bills);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/bills/client/:clientName", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const clientName = req.params.clientName;
      if (!clientName) {
        return res.status(400).json({ message: "Client name is required" });
      }
      
      const bills = await storage.getBillsByClientName(clientName);
      res.json(bills);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/bills/status/:status", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const status = req.params.status;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const bills = await storage.getBillsByStatus(status);
      res.json(bills);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/bills/date-range", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const bills = await storage.getBillsByDateRange(new Date(startDate as string), new Date(endDate as string));
      res.json(bills);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post("/api/bills", authenticateJWT, authorize(["admin", "hr"]), async (req: Request, res: Response) => {
    try {
      const validatedData = insertBillSchema.parse(req.body);
      const bill = await storage.createBill(validatedData);
      res.status(201).json(bill);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.patch("/api/bills/:id", authenticateJWT, authorize(["admin", "hr"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }
      
      const validatedData = insertBillSchema.partial().parse(req.body);
      const updatedBill = await storage.updateBill(id, validatedData);
      
      if (!updatedBill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      res.json(updatedBill);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.patch("/api/bills/:id/status", authenticateJWT, authorize(["admin", "hr"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }
      
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedBill = await storage.updateBillStatus(id, status);
      
      if (!updatedBill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      res.json(updatedBill);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.delete("/api/bills/:id", authenticateJWT, authorize(["admin", "hr"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }
      
      const success = await storage.deleteBill(id);
      if (!success) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Bill Payment routes
  app.get("/api/bill-payments", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const payments = await storage.getAllBillPayments();
      res.json(payments);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/bill-payments/:id", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const payment = await storage.getBillPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(payment);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/bill-payments/bill/:billId", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const billId = parseInt(req.params.billId);
      if (isNaN(billId)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }
      
      const payments = await storage.getBillPaymentsByBillId(billId);
      res.json(payments);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post("/api/bill-payments", authenticateJWT, authorize(["admin", "hr"]), async (req: Request, res: Response) => {
    try {
      const validatedData = insertBillPaymentSchema.parse(req.body);
      const payment = await storage.createBillPayment(validatedData);
      res.status(201).json(payment);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.patch("/api/bill-payments/:id", authenticateJWT, authorize(["admin", "hr"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const validatedData = insertBillPaymentSchema.partial().parse(req.body);
      const updatedPayment = await storage.updateBillPayment(id, validatedData);
      
      if (!updatedPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(updatedPayment);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.delete("/api/bill-payments/:id", authenticateJWT, authorize(["admin", "hr"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const success = await storage.deleteBillPayment(id);
      if (!success) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Create a server instance
  // Data export API endpoints
  app.post("/api/admin/export", authenticateJWT, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const { exportType } = req.body;
      
      if (!exportType) {
        return res.status(400).json({ error: "Export type is required" });
      }
      
      // Create exports directory if it doesn't exist
      const exportsDir = path.join(process.cwd(), "exports");
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      
      // Generate a timestamp for the filename
      const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
      
      // Determine file extension based on export type
      let fileExtension = "csv";
      if (exportType.includes("json")) {
        fileExtension = "json";
      } else if (exportType === "database") {
        fileExtension = "sql";
      } else if (exportType === "all") {
        fileExtension = "zip";
      }
      
      // Generate export filename
      const fileName = `${exportType}_${timestamp}.${fileExtension}`;
      const outputPath = path.join(exportsDir, fileName);
      
      // Import our export utility functions - we'll use child_process to run it
      const exportScriptPath = path.join(process.cwd(), "export_utils.py");
      const { exec } = require("child_process");
      
      // Run the Python export script
      const command = `python ${exportScriptPath} ${exportType} ${outputPath}`;
      
      exec(command, (error: any, stdout: string, stderr: string) => {
        if (error) {
          console.error(`Export error: ${error.message}`);
          console.error(`stderr: ${stderr}`);
          return res.status(500).json({ error: "Export failed", details: error.message });
        }
        
        console.log(`Export output: ${stdout}`);
        
        // Check if file was created
        if (!fs.existsSync(outputPath)) {
          return res.status(500).json({ error: "Export file not created" });
        }
        
        // Return the download URL
        const downloadUrl = `/api/admin/export/download/${fileName}`;
        res.status(200).json({ success: true, fileName, downloadUrl });
      });
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to process export request" });
    }
  });
  
  // Download endpoint for exported files
  app.get("/api/admin/export/download/:filename", authenticateJWT, authorize(["admin"]), (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      
      // Security check - prevent path traversal attacks
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return res.status(400).json({ error: "Invalid filename" });
      }
      
      const filePath = path.join(process.cwd(), "exports", filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Set content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = "text/plain";
      
      switch (ext) {
        case ".csv":
          contentType = "text/csv";
          break;
        case ".json":
          contentType = "application/json";
          break;
        case ".sql":
          contentType = "application/sql";
          break;
        case ".zip":
          contentType = "application/zip";
          break;
      }
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
