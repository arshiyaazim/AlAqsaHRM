import type { Express, Request, Response, NextFunction } from "express";
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
  insertDashboardStatsSchema
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { readEmployeeExcel } from "./utils/excelImport";
import { upload, handleFileUploadErrors } from "./utils/fileUpload";
import path from "path";
import { promises as fs } from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
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
  
  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      // For testing purposes, allow any login
      res.json({ 
        token: "test-token", 
        user: { 
          id: 1, 
          username: username || "admin", 
          role: "admin" 
        } 
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Dashboard stats routes
  app.get("/api/dashboard", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      if (!stats) {
        return res.status(404).json({ message: "Dashboard stats not found" });
      }
      res.json(stats);
    } catch (err) {
      handleError(err, res);
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
      
      const result = await readEmployeeExcel(filePath);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: result.message,
          errors: result.errors 
        });
      }
      
      // Process the imported data
      const importedEmployees = [];
      const errors = [];
      
      if (result.data && result.data.length > 0) {
        for (const employeeData of result.data) {
          try {
            // Validate each employee against our schema
            const validatedData = insertEmployeeSchema.parse(employeeData);
            const employee = await storage.createEmployee(validatedData);
            importedEmployees.push(employee);
          } catch (err) {
            if (err instanceof ZodError) {
              const formattedError = fromZodError(err);
              errors.push({
                data: employeeData,
                errors: formattedError.details
              });
            } else {
              errors.push({
                data: employeeData,
                errors: [err.message || "Unknown error"]
              });
            }
          }
        }
      }
      
      res.status(200).json({
        message: `Imported ${importedEmployees.length} employees with ${errors.length} errors`,
        imported: importedEmployees,
        errors: errors.length > 0 ? errors : undefined
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
        return res.status(400).json({ message: "Invalid income ID" });
      }
      
      const income = await storage.getDailyIncome(id);
      if (!income) {
        return res.status(404).json({ message: "Income record not found" });
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
        return res.status(400).json({ message: "Invalid income ID" });
      }
      
      const validatedData = insertDailyIncomeSchema.partial().parse(req.body);
      const updatedIncome = await storage.updateDailyIncome(id, validatedData);
      
      if (!updatedIncome) {
        return res.status(404).json({ message: "Income record not found" });
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
        return res.status(400).json({ message: "Invalid income ID" });
      }
      
      const success = await storage.deleteDailyIncome(id);
      if (!success) {
        return res.status(404).json({ message: "Income record not found" });
      }
      
      res.status(204).send();
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
      
      const filePath = req.file.path;
      const fileName = req.file.originalname;
      
      res.status(200).json({
        message: "File uploaded successfully",
        filePath: filePath,
        fileName: fileName
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Create a server instance
  const httpServer = createServer(app);
  return httpServer;
}
