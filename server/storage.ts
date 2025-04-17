import { 
  Employee, InsertEmployee, 
  Project, InsertProject,
  Attendance, InsertAttendance,
  DailyExpenditure, InsertDailyExpenditure,
  DailyIncome, InsertDailyIncome,
  Payroll, InsertPayroll,
  Payment, InsertPayment,
  DashboardStats, InsertDashboardStats,
  User, InsertUser,
  employees, projects, attendance, dailyExpenditure, dailyIncome, payroll, payments, dashboardStats, users
} from "@shared/schema";
import { db } from "./db";
import { and, eq, sql, gte, lte } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Interface for uploaded files
export interface UploadedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  uploadDate: string;
}

export interface IStorage {
  // User operations
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByCredentials(email: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // File operations
  getUploadedFiles(): Promise<UploadedFile[]>;
  getUploadedFile(id: string): Promise<UploadedFile | undefined>;
  saveUploadedFile(file: UploadedFile): Promise<UploadedFile>;
  deleteUploadedFile(id: string): Promise<boolean>;
  
  // Employee operations
  getAllEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;
  
  // Project operations
  getAllProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Attendance operations
  getAllAttendance(): Promise<Attendance[]>;
  getAttendance(id: number): Promise<Attendance | undefined>;
  getAttendanceByDate(date: Date): Promise<Attendance[]>;
  getAttendanceByEmployeeId(employeeId: number): Promise<Attendance[]>;
  getAttendanceByProjectId(projectId: number): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  deleteAttendance(id: number): Promise<boolean>;
  
  // Daily Expenditure operations
  getAllDailyExpenditures(): Promise<DailyExpenditure[]>;
  getDailyExpenditure(id: number): Promise<DailyExpenditure | undefined>;
  getDailyExpendituresByDate(date: Date): Promise<DailyExpenditure[]>;
  getDailyExpendituresByEmployeeId(employeeId: number): Promise<DailyExpenditure[]>;
  getLoanAdvancesByEmployeeId(employeeId: number): Promise<number>;
  createDailyExpenditure(expenditure: InsertDailyExpenditure): Promise<DailyExpenditure>;
  updateDailyExpenditure(id: number, expenditure: Partial<InsertDailyExpenditure>): Promise<DailyExpenditure | undefined>;
  deleteDailyExpenditure(id: number): Promise<boolean>;
  
  // Daily Income operations
  getAllDailyIncomes(): Promise<DailyIncome[]>;
  getDailyIncome(id: number): Promise<DailyIncome | undefined>;
  getDailyIncomesByDate(date: Date): Promise<DailyIncome[]>;
  createDailyIncome(income: InsertDailyIncome): Promise<DailyIncome>;
  updateDailyIncome(id: number, income: Partial<InsertDailyIncome>): Promise<DailyIncome | undefined>;
  deleteDailyIncome(id: number): Promise<boolean>;
  
  // Payroll operations
  getAllPayrolls(): Promise<Payroll[]>;
  getPayroll(id: number): Promise<Payroll | undefined>;
  getPayrollByEmployeeId(employeeId: number): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(id: number, payroll: Partial<InsertPayroll>): Promise<Payroll | undefined>;
  deletePayroll(id: number): Promise<boolean>;
  
  // Payment operations
  getAllPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByPayrollId(payrollId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
  
  // Dashboard stats operations
  getDashboardStats(): Promise<DashboardStats | undefined>;
  createOrUpdateDashboardStats(stats: InsertDashboardStats): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByCredentials(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;
    
    console.log("User found:", user.email, "Comparing password...");
    console.log("Hash in DB:", user.password);
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log("Password match result:", isMatch);
      return isMatch ? user : undefined;
    } catch (error) {
      console.error("bcrypt.compare error:", error);
      return undefined;
    }
  }
  
  async createUser(user: InsertUser): Promise<User> {
    // Generate fullName from firstName and lastName
    const fullName = `${user.firstName} ${user.lastName}`;
    const [newUser] = await db.insert(users).values({...user, fullName}).returning();
    return newUser;
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = await this.getUser(id);
    if (!existingUser) return undefined;
    
    // If firstName or lastName is updated, update fullName too
    let fullNameUpdate = {};
    if (user.firstName || user.lastName) {
      const firstName = user.firstName || existingUser.firstName;
      const lastName = user.lastName || existingUser.lastName;
      fullNameUpdate = { fullName: `${firstName} ${lastName}` };
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({...user, ...fullNameUpdate})
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const existingUser = await this.getUser(id);
    if (!existingUser) return undefined;
    
    const [updatedUser] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return !!result.rowCount;
  }
  
  // File operations
  async getUploadedFiles(): Promise<UploadedFile[]> {
    // Since we don't have a formal table for files, we'll read from the uploads directory
    try {
      const fs = require('fs');
      const path = require('path');
      const { promisify } = require('util');
      const readdir = promisify(fs.readdir);
      const stat = promisify(fs.stat);
      
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Check if uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        return [];
      }
      
      // Get all files in the uploads directory
      const files = await readdir(uploadsDir);
      
      // Get details for each file
      const fileDetailsPromises = files.map(async (filename: string) => {
        const filePath = path.join(uploadsDir, filename);
        const stats = await stat(filePath);
        
        // Skip directories
        if (stats.isDirectory()) return null;
        
        // Get file extension to determine mime type
        const ext = path.extname(filename).toLowerCase();
        let mimeType = 'application/octet-stream'; // Default mime type
        
        // Map common extensions to mime types
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.pdf': 'application/pdf',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.xls': 'application/vnd.ms-excel',
          '.csv': 'text/csv',
        };
        
        if (mimeTypes[ext]) {
          mimeType = mimeTypes[ext];
        }
        
        return {
          id: Buffer.from(filePath).toString('base64'),
          name: filename,
          path: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
          size: stats.size,
          mimeType,
          uploadDate: stats.mtime.toISOString(),
        };
      });
      
      // Filter out directories (null values) and sort by upload date (newest first)
      const fileDetails = (await Promise.all(fileDetailsPromises))
        .filter(Boolean)
        .sort((a, b) => new Date(b!.uploadDate).getTime() - new Date(a!.uploadDate).getTime());
      
      return fileDetails as UploadedFile[];
    } catch (error) {
      console.error('Error getting uploaded files:', error);
      return [];
    }
  }
  
  async getUploadedFile(id: string): Promise<UploadedFile | undefined> {
    try {
      // Get all files and find the one with matching ID
      const files = await this.getUploadedFiles();
      return files.find(file => file.id === id);
    } catch (error) {
      console.error('Error getting uploaded file:', error);
      return undefined;
    }
  }
  
  async saveUploadedFile(file: UploadedFile): Promise<UploadedFile> {
    // This is mostly handled by the multer middleware
    // This method is a placeholder for any additional processing or database tracking
    return file;
  }
  
  async deleteUploadedFile(id: string): Promise<boolean> {
    try {
      const fs = require('fs');
      const { promisify } = require('util');
      const unlink = promisify(fs.unlink);
      
      // Get the file
      const file = await this.getUploadedFile(id);
      if (!file) return false;
      
      // Delete the file from the filesystem
      const filePath = file.path;
      await unlink(filePath);
      
      return true;
    } catch (error) {
      console.error('Error deleting uploaded file:', error);
      return false;
    }
  }
  
  // Employee operations
  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }
  
  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }
  
  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeId, employeeId));
    return employee;
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }
  
  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const existingEmployee = await this.getEmployee(id);
    if (!existingEmployee) return undefined;
    
    const [updatedEmployee] = await db
      .update(employees)
      .set(employee)
      .where(eq(employees.id, id))
      .returning();
    
    return updatedEmployee;
  }
  
  async deleteEmployee(id: number): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id));
    return !!result.rowCount;
  }
  
  // Project operations
  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }
  
  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = await this.getProject(id);
    if (!existingProject) return undefined;
    
    const [updatedProject] = await db
      .update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return !!result.rowCount;
  }
  
  // Attendance operations
  async getAllAttendance(): Promise<Attendance[]> {
    return await db.select().from(attendance);
  }
  
  async getAttendance(id: number): Promise<Attendance | undefined> {
    const [record] = await db.select().from(attendance).where(eq(attendance.id, id));
    return record;
  }
  
  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    // Format date to match database format (without time part)
    const formattedDate = date.toISOString().split('T')[0];
    return await db.select().from(attendance).where(eq(attendance.date, formattedDate));
  }
  
  async getAttendanceByEmployeeId(employeeId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.employeeId, employeeId));
  }
  
  async getAttendanceByProjectId(projectId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.projectId, projectId));
  }
  
  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db.insert(attendance).values(attendanceData).returning();
    return newAttendance;
  }
  
  async updateAttendance(id: number, attendanceData: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const existingAttendance = await this.getAttendance(id);
    if (!existingAttendance) return undefined;
    
    const [updatedAttendance] = await db
      .update(attendance)
      .set(attendanceData)
      .where(eq(attendance.id, id))
      .returning();
    
    return updatedAttendance;
  }
  
  async deleteAttendance(id: number): Promise<boolean> {
    const result = await db.delete(attendance).where(eq(attendance.id, id));
    return !!result.rowCount;
  }
  
  // Daily Expenditure operations
  async getAllDailyExpenditures(): Promise<DailyExpenditure[]> {
    return await db.select().from(dailyExpenditure);
  }
  
  async getDailyExpenditure(id: number): Promise<DailyExpenditure | undefined> {
    const [expenditure] = await db.select().from(dailyExpenditure).where(eq(dailyExpenditure.id, id));
    return expenditure;
  }
  
  async getDailyExpendituresByDate(date: Date): Promise<DailyExpenditure[]> {
    // Format date to match database format (without time part)
    const formattedDate = date.toISOString().split('T')[0];
    return await db.select().from(dailyExpenditure).where(eq(dailyExpenditure.date, formattedDate));
  }
  
  async getDailyExpendituresByEmployeeId(employeeId: number): Promise<DailyExpenditure[]> {
    return await db.select().from(dailyExpenditure).where(eq(dailyExpenditure.employeeId, employeeId));
  }
  
  async getLoanAdvancesByEmployeeId(employeeId: number): Promise<number> {
    const records = await this.getDailyExpendituresByEmployeeId(employeeId);
    return records.reduce((total, record) => {
      if (record.loanAdvance) {
        return total + parseFloat(record.loanAdvance);
      }
      return total;
    }, 0);
  }
  
  async createDailyExpenditure(expenditureData: InsertDailyExpenditure): Promise<DailyExpenditure> {
    const [newExpenditure] = await db.insert(dailyExpenditure).values(expenditureData).returning();
    return newExpenditure;
  }
  
  async updateDailyExpenditure(id: number, expenditureData: Partial<InsertDailyExpenditure>): Promise<DailyExpenditure | undefined> {
    const existingExpenditure = await this.getDailyExpenditure(id);
    if (!existingExpenditure) return undefined;
    
    const [updatedExpenditure] = await db
      .update(dailyExpenditure)
      .set(expenditureData)
      .where(eq(dailyExpenditure.id, id))
      .returning();
    
    return updatedExpenditure;
  }
  
  async deleteDailyExpenditure(id: number): Promise<boolean> {
    const result = await db.delete(dailyExpenditure).where(eq(dailyExpenditure.id, id));
    return !!result.rowCount;
  }
  
  // Daily Income operations
  async getAllDailyIncomes(): Promise<DailyIncome[]> {
    return await db.select().from(dailyIncome);
  }
  
  async getDailyIncome(id: number): Promise<DailyIncome | undefined> {
    const [income] = await db.select().from(dailyIncome).where(eq(dailyIncome.id, id));
    return income;
  }
  
  async getDailyIncomesByDate(date: Date): Promise<DailyIncome[]> {
    // Format date to match database format (without time part)
    const formattedDate = date.toISOString().split('T')[0];
    return await db.select().from(dailyIncome).where(eq(dailyIncome.date, formattedDate));
  }
  
  async createDailyIncome(incomeData: InsertDailyIncome): Promise<DailyIncome> {
    const [newIncome] = await db.insert(dailyIncome).values(incomeData).returning();
    return newIncome;
  }
  
  async updateDailyIncome(id: number, incomeData: Partial<InsertDailyIncome>): Promise<DailyIncome | undefined> {
    const existingIncome = await this.getDailyIncome(id);
    if (!existingIncome) return undefined;
    
    const [updatedIncome] = await db
      .update(dailyIncome)
      .set(incomeData)
      .where(eq(dailyIncome.id, id))
      .returning();
    
    return updatedIncome;
  }
  
  async deleteDailyIncome(id: number): Promise<boolean> {
    const result = await db.delete(dailyIncome).where(eq(dailyIncome.id, id));
    return !!result.rowCount;
  }
  
  // Payroll operations
  async getAllPayrolls(): Promise<Payroll[]> {
    return await db.select().from(payroll);
  }
  
  async getPayroll(id: number): Promise<Payroll | undefined> {
    const [payrollRecord] = await db.select().from(payroll).where(eq(payroll.id, id));
    return payrollRecord;
  }
  
  async getPayrollByEmployeeId(employeeId: number): Promise<Payroll[]> {
    return await db.select().from(payroll).where(eq(payroll.employeeId, employeeId));
  }
  
  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const [newPayroll] = await db.insert(payroll).values(payrollData).returning();
    return newPayroll;
  }
  
  async updatePayroll(id: number, payrollData: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    const existingPayroll = await this.getPayroll(id);
    if (!existingPayroll) return undefined;
    
    const [updatedPayroll] = await db
      .update(payroll)
      .set(payrollData)
      .where(eq(payroll.id, id))
      .returning();
    
    return updatedPayroll;
  }
  
  async deletePayroll(id: number): Promise<boolean> {
    const result = await db.delete(payroll).where(eq(payroll.id, id));
    return !!result.rowCount;
  }
  
  // Payment operations
  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }
  
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }
  
  async getPaymentsByPayrollId(payrollId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.payrollId, payrollId));
  }
  
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(paymentData).returning();
    return newPayment;
  }
  
  async updatePayment(id: number, paymentData: Partial<InsertPayment>): Promise<Payment | undefined> {
    const existingPayment = await this.getPayment(id);
    if (!existingPayment) return undefined;
    
    const [updatedPayment] = await db
      .update(payments)
      .set(paymentData)
      .where(eq(payments.id, id))
      .returning();
    
    return updatedPayment;
  }
  
  async deletePayment(id: number): Promise<boolean> {
    const result = await db.delete(payments).where(eq(payments.id, id));
    return !!result.rowCount;
  }
  
  // Dashboard stats operations
  async getDashboardStats(): Promise<DashboardStats | undefined> {
    const [stats] = await db.select().from(dashboardStats);
    return stats;
  }
  
  async createOrUpdateDashboardStats(statsData: InsertDashboardStats): Promise<DashboardStats> {
    // Check if stats record exists
    const existingStats = await this.getDashboardStats();
    
    if (existingStats) {
      // Update existing record
      const [updatedStats] = await db
        .update(dashboardStats)
        .set(statsData)
        .where(eq(dashboardStats.id, existingStats.id))
        .returning();
      
      return updatedStats;
    } else {
      // Create new record
      const [newStats] = await db.insert(dashboardStats).values(statsData).returning();
      return newStats;
    }
  }
}

export const storage = new DatabaseStorage();