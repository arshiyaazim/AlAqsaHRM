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
  CompanySettings, InsertCompanySettings,
  ShipDuty, InsertShipDuty,
  Bill, InsertBill,
  BillPayment, InsertBillPayment,
  employees, projects, attendance, dailyExpenditure, dailyIncome, payroll, payments, dashboardStats, users, companySettings,
  shipDuty, bills, billPayments
} from "@shared/schema";
import { db } from "./db";
import { and, eq, sql, gte, lte } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

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
  // Database health check
  testDatabaseConnection(): Promise<boolean>;
  
  // User operations
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByCredentials(email: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  updateUserPermissions(id: number, permissions: object): Promise<User | undefined>;
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
  deleteAllEmployees(): Promise<number>;
  
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
  
  // Ship Duty operations
  getAllShipDuties(): Promise<ShipDuty[]>;
  getShipDuty(id: number): Promise<ShipDuty | undefined>;
  getShipDutiesByProjectId(projectId: number): Promise<ShipDuty[]>;
  getShipDutiesByEmployeeId(employeeId: number): Promise<ShipDuty[]>;
  getShipDutiesByDateRange(startDate: Date, endDate: Date): Promise<ShipDuty[]>;
  createShipDuty(duty: InsertShipDuty): Promise<ShipDuty>;
  updateShipDuty(id: number, duty: Partial<InsertShipDuty>): Promise<ShipDuty | undefined>;
  deleteShipDuty(id: number): Promise<boolean>;
  
  // Bill operations
  getAllBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  getBillByBillNumber(billNumber: string): Promise<Bill | undefined>;
  getBillsByProjectId(projectId: number): Promise<Bill[]>;
  getBillsByClientName(clientName: string): Promise<Bill[]>;
  getBillsByDateRange(startDate: Date, endDate: Date): Promise<Bill[]>;
  getBillsByStatus(status: string): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill | undefined>;
  updateBillStatus(id: number, status: string): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<boolean>;
  
  // Bill Payment operations
  getAllBillPayments(): Promise<BillPayment[]>;
  getBillPayment(id: number): Promise<BillPayment | undefined>;
  getBillPaymentsByBillId(billId: number): Promise<BillPayment[]>;
  createBillPayment(payment: InsertBillPayment): Promise<BillPayment>;
  updateBillPayment(id: number, payment: Partial<InsertBillPayment>): Promise<BillPayment | undefined>;
  deleteBillPayment(id: number): Promise<boolean>;
  
  // Dashboard stats operations
  getDashboardStats(): Promise<DashboardStats | undefined>;
  createOrUpdateDashboardStats(stats: InsertDashboardStats): Promise<DashboardStats>;
  
  // Company settings operations
  getCompanySettings(): Promise<CompanySettings | undefined>;
  createOrUpdateCompanySettings(settings: Partial<InsertCompanySettings>): Promise<CompanySettings>;
  
  // Report operations
  getCompanyDetails(): Promise<any>;
  getAttendanceRecords(filters?: any): Promise<any[]>;
  getPayrollRecords(filters?: any): Promise<any[]>;
  getEmployees(filters?: any): Promise<any[]>;
  getProjects(filters?: any): Promise<any[]>;
  getExpenditures(filters?: any): Promise<any[]>;
  getIncomes(filters?: any): Promise<any[]>;
  getShipDutyRecords(filters?: any): Promise<any[]>;
  getBillRecords(filters?: any): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // Database health check
  async testDatabaseConnection(): Promise<boolean> {
    try {
      // Run a simple query to verify database connectivity
      await db.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      console.error("Database connection test failed:", error);
      return false;
    }
  }

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
  
  async updateUserPermissions(id: number, permissions: object): Promise<User | undefined> {
    const existingUser = await this.getUser(id);
    if (!existingUser) return undefined;
    
    const [updatedUser] = await db
      .update(users)
      .set({ permissions })
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
    try {
      const readdir = promisify(fs.readdir);
      const stat = promisify(fs.stat);
      
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Check if uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        return [];
      }
      
      // Check if metadata file exists
      const metadataFilePath = path.join(uploadsDir, '.metadata.json');
      let metadata: UploadedFile[] = [];
      
      if (fs.existsSync(metadataFilePath)) {
        try {
          const data = fs.readFileSync(metadataFilePath, 'utf8');
          metadata = JSON.parse(data);
          
          // Verify that the files still exist
          const verifiedMetadata = [];
          for (const file of metadata) {
            if (fs.existsSync(file.path)) {
              verifiedMetadata.push(file);
            }
          }
          
          // Sort by upload date (newest first)
          return verifiedMetadata.sort(
            (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
          );
        } catch (err) {
          console.error('Error reading metadata file:', err);
          // Fall back to scanning directory if metadata file is corrupted
        }
      }
      
      // If no metadata file or it's corrupted, fallback to scanning directory
      const files = await readdir(uploadsDir);
      
      // Filter out the metadata file and other hidden files
      const visibleFiles = files.filter((f: string) => !f.startsWith('.'));
      
      // Get details for each file
      const fileDetailsPromises = visibleFiles.map(async (filename: string) => {
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
        
        const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
        
        return {
          id: Buffer.from(relativePath).toString('base64'),
          name: filename,
          path: relativePath,
          size: stats.size,
          mimeType,
          uploadDate: stats.mtime.toISOString(),
        };
      });
      
      // Filter out directories (null values) and sort by upload date (newest first)
      const fileDetails = (await Promise.all(fileDetailsPromises))
        .filter(Boolean)
        .sort((a, b) => new Date(b!.uploadDate).getTime() - new Date(a!.uploadDate).getTime());
      
      // Save the generated metadata for future use
      if (fileDetails.length > 0) {
        fs.writeFileSync(metadataFilePath, JSON.stringify(fileDetails, null, 2));
      }
      
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
    try {
      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Create a JSON file with the file metadata
      const metadataFilePath = path.join(uploadsDir, '.metadata.json');
      let metadata: UploadedFile[] = [];
      
      // Try to read existing metadata
      if (fs.existsSync(metadataFilePath)) {
        try {
          const data = fs.readFileSync(metadataFilePath, 'utf8');
          metadata = JSON.parse(data);
        } catch (err) {
          console.error('Error reading metadata file:', err);
          // Continue with empty metadata if file is corrupted
        }
      }
      
      // Check if file already exists in metadata
      const existingIndex = metadata.findIndex(f => f.id === file.id);
      if (existingIndex >= 0) {
        // Update existing metadata
        metadata[existingIndex] = file;
      } else {
        // Add new file metadata
        metadata.push(file);
      }
      
      // Save updated metadata
      fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));
      
      return file;
    } catch (error) {
      console.error('Error saving file metadata:', error);
      return file; // Return file even if metadata saving fails
    }
  }
  
  async deleteUploadedFile(id: string): Promise<boolean> {
    try {
      const unlink = promisify(fs.unlink);
      
      // Get the file
      const file = await this.getUploadedFile(id);
      if (!file) return false;
      
      // Delete the file from the filesystem
      const filePath = file.path;
      await unlink(filePath);
      
      // Update the metadata file
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const metadataFilePath = path.join(uploadsDir, '.metadata.json');
      
      if (fs.existsSync(metadataFilePath)) {
        try {
          const data = fs.readFileSync(metadataFilePath, 'utf8');
          let metadata = JSON.parse(data);
          
          // Remove the deleted file from metadata
          metadata = metadata.filter((f: UploadedFile) => f.id !== id);
          
          // Save updated metadata
          fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));
        } catch (err) {
          console.error('Error updating metadata after file deletion:', err);
          // Continue even if metadata update fails
        }
      }
      
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
  
  async deleteAllEmployees(): Promise<number> {
    // Delete all employees from the database and return the count of deleted rows
    const result = await db.delete(employees);
    return result.rowCount || 0;
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
    try {
      const [stats] = await db.select().from(dashboardStats);
      
      if (!stats) {
        // Generate default stats if none exist
        const today = new Date().toISOString().split('T')[0];
        
        // Get counts
        const employeeCount = await this.getEmployeeCount();
        const projectCount = await this.getActiveProjectCount();
        
        // Create default stats
        const defaultStats: InsertDashboardStats = {
          date: today,
          totalEmployees: employeeCount,
          presentEmployees: 0,
          absentEmployees: 0,
          lateEmployees: 0,
          activeProjects: projectCount, 
          totalPayroll: "0"
        };
        
        // Save default stats
        const [newStats] = await db
          .insert(dashboardStats)
          .values(defaultStats)
          .returning();
          
        return newStats;
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      
      // Return a default stats object to prevent errors
      return {
        id: 0,
        date: new Date().toISOString().split('T')[0],
        totalEmployees: 0,
        presentEmployees: 0,
        absentEmployees: 0,
        lateEmployees: 0,
        activeProjects: 0,
        totalPayroll: "0"
      };
    }
  }
  
  // Get employee count for dashboard stats
  async getEmployeeCount(): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(employees);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting employees:', error);
      return 0;
    }
  }
  
  // Get active project count for dashboard stats
  async getActiveProjectCount(): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(eq(projects.isActive, true));
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting active projects:', error);
      return 0;
    }
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

  // Company settings operations
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    try {
      const [settings] = await db
        .select()
        .from(companySettings)
        .limit(1);
      
      return settings;
    } catch (error) {
      console.error('Error fetching company settings:', error);
      return undefined;
    }
  }
  
  async createOrUpdateCompanySettings(settingsData: Partial<InsertCompanySettings>): Promise<CompanySettings> {
    try {
      const existingSettings = await this.getCompanySettings();
      
      if (existingSettings) {
        // Update existing settings
        const [updatedSettings] = await db
          .update(companySettings)
          .set({
            ...settingsData,
            updatedAt: new Date()
          })
          .where(eq(companySettings.id, existingSettings.id))
          .returning();
        
        return updatedSettings;
      } else {
        // Create new settings record
        const [newSettings] = await db
          .insert(companySettings)
          .values({
            ...settingsData,
            companyName: settingsData.companyName || "HR & Payroll Management",
            primaryColor: settingsData.primaryColor || "#2C5282",
          })
          .returning();
        
        return newSettings;
      }
    } catch (error) {
      console.error('Error creating/updating company settings:', error);
      // Return a default settings object if database operation fails
      return {
        id: 0,
        companyName: settingsData.companyName || "HR & Payroll Management",
        companyTagline: settingsData.companyTagline || "Manage your workforce efficiently",
        primaryColor: settingsData.primaryColor || "#2C5282",
        logoUrl: settingsData.logoUrl,
        updatedAt: new Date()
      };
    }
  }

  // Report operations
  async getCompanyDetails(): Promise<any> {
    const settings = await this.getCompanySettings();
    return {
      companyName: settings?.companyName || "Company Name",
      companyLogo: settings?.logoUrl || "",
      companyAddress: settings?.address || "",
      companyPhone: settings?.phone || "",
      companyEmail: settings?.email || "",
      reportDate: new Date().toISOString(),
      generatedBy: "HR Management System"
    };
  }

  async getAttendanceRecords(filters?: any): Promise<any[]> {
    let query = db.select({
      id: attendance.id,
      date: attendance.date,
      employeeId: attendance.employeeId,
      employeeName: employees.fullName,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      projectId: attendance.projectId,
      projectName: projects.name,
      status: attendance.status,
      remarks: attendance.remarks,
      hoursWorked: attendance.hoursWorked,
    })
    .from(attendance)
    .leftJoin(employees, eq(attendance.employeeId, employees.id))
    .leftJoin(projects, eq(attendance.projectId, projects.id));
    
    if (filters) {
      if (filters.dateFrom && filters.dateTo) {
        query = query.where(
          and(
            gte(attendance.date, new Date(filters.dateFrom)),
            lte(attendance.date, new Date(filters.dateTo))
          )
        );
      }
      
      if (filters.employeeId) {
        query = query.where(eq(attendance.employeeId, filters.employeeId));
      }
      
      if (filters.projectId) {
        query = query.where(eq(attendance.projectId, filters.projectId));
      }
      
      if (filters.status) {
        query = query.where(eq(attendance.status, filters.status));
      }
    }
    
    return await query;
  }

  async getPayrollRecords(filters?: any): Promise<any[]> {
    let query = db.select({
      id: payroll.id,
      employeeId: payroll.employeeId,
      employeeName: employees.fullName,
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      basicSalary: payroll.basicSalary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      tax: payroll.tax,
      netSalary: payroll.netSalary,
      status: payroll.status,
      remarks: payroll.remarks,
      paymentDate: payroll.paymentDate,
    })
    .from(payroll)
    .leftJoin(employees, eq(payroll.employeeId, employees.id));
    
    if (filters) {
      if (filters.periodStart && filters.periodEnd) {
        query = query.where(
          and(
            gte(payroll.periodStart, new Date(filters.periodStart)),
            lte(payroll.periodEnd, new Date(filters.periodEnd))
          )
        );
      }
      
      if (filters.employeeId) {
        query = query.where(eq(payroll.employeeId, filters.employeeId));
      }
      
      if (filters.status) {
        query = query.where(eq(payroll.status, filters.status));
      }
    }
    
    return await query;
  }

  async getEmployees(filters?: any): Promise<any[]> {
    let query = db.select().from(employees);
    
    if (filters) {
      if (filters.designation) {
        query = query.where(eq(employees.designation, filters.designation));
      }
      
      if (filters.status) {
        query = query.where(eq(employees.status, filters.status));
      }
    }
    
    return await query;
  }

  async getProjects(filters?: any): Promise<any[]> {
    let query = db.select().from(projects);
    
    if (filters) {
      if (filters.status) {
        query = query.where(eq(projects.status, filters.status));
      }
      
      if (filters.clientName) {
        query = query.where(eq(projects.clientName, filters.clientName));
      }
    }
    
    return await query;
  }

  async getExpenditures(filters?: any): Promise<any[]> {
    let query = db.select({
      id: dailyExpenditure.id,
      date: dailyExpenditure.date,
      amount: dailyExpenditure.amount,
      category: dailyExpenditure.category,
      description: dailyExpenditure.description,
      employeeId: dailyExpenditure.employeeId,
      employeeName: employees.fullName,
      projectId: dailyExpenditure.projectId,
      projectName: projects.name,
    })
    .from(dailyExpenditure)
    .leftJoin(employees, eq(dailyExpenditure.employeeId, employees.id))
    .leftJoin(projects, eq(dailyExpenditure.projectId, projects.id));
    
    if (filters) {
      if (filters.dateFrom && filters.dateTo) {
        query = query.where(
          and(
            gte(dailyExpenditure.date, new Date(filters.dateFrom)),
            lte(dailyExpenditure.date, new Date(filters.dateTo))
          )
        );
      }
      
      if (filters.category) {
        query = query.where(eq(dailyExpenditure.category, filters.category));
      }
      
      if (filters.employeeId) {
        query = query.where(eq(dailyExpenditure.employeeId, filters.employeeId));
      }
      
      if (filters.projectId) {
        query = query.where(eq(dailyExpenditure.projectId, filters.projectId));
      }
    }
    
    return await query;
  }

  async getIncomes(filters?: any): Promise<any[]> {
    let query = db.select({
      id: dailyIncome.id,
      date: dailyIncome.date,
      amount: dailyIncome.amount,
      category: dailyIncome.category,
      description: dailyIncome.description,
      projectId: dailyIncome.projectId,
      projectName: projects.name,
    })
    .from(dailyIncome)
    .leftJoin(projects, eq(dailyIncome.projectId, projects.id));
    
    if (filters) {
      if (filters.dateFrom && filters.dateTo) {
        query = query.where(
          and(
            gte(dailyIncome.date, new Date(filters.dateFrom)),
            lte(dailyIncome.date, new Date(filters.dateTo))
          )
        );
      }
      
      if (filters.category) {
        query = query.where(eq(dailyIncome.category, filters.category));
      }
      
      if (filters.projectId) {
        query = query.where(eq(dailyIncome.projectId, filters.projectId));
      }
    }
    
    return await query;
  }
  
  // Ship Duty operations
  async getAllShipDuties(): Promise<ShipDuty[]> {
    return await db.select().from(shipDuty);
  }
  
  async getShipDuty(id: number): Promise<ShipDuty | undefined> {
    const [duty] = await db.select().from(shipDuty).where(eq(shipDuty.id, id));
    return duty;
  }
  
  async getShipDutiesByProjectId(projectId: number): Promise<ShipDuty[]> {
    return await db.select().from(shipDuty).where(eq(shipDuty.projectId, projectId));
  }
  
  async getShipDutiesByEmployeeId(employeeId: number): Promise<ShipDuty[]> {
    return await db.select().from(shipDuty).where(eq(shipDuty.employeeId, employeeId));
  }
  
  async getShipDutiesByDateRange(startDate: Date, endDate: Date): Promise<ShipDuty[]> {
    return await db.select().from(shipDuty).where(
      and(
        gte(shipDuty.dutyDate, startDate),
        lte(shipDuty.dutyDate, endDate)
      )
    );
  }
  
  async createShipDuty(duty: InsertShipDuty): Promise<ShipDuty> {
    const [newDuty] = await db.insert(shipDuty).values(duty).returning();
    return newDuty;
  }
  
  async updateShipDuty(id: number, duty: Partial<InsertShipDuty>): Promise<ShipDuty | undefined> {
    const [updatedDuty] = await db
      .update(shipDuty)
      .set(duty)
      .where(eq(shipDuty.id, id))
      .returning();
    
    return updatedDuty;
  }
  
  async deleteShipDuty(id: number): Promise<boolean> {
    const result = await db.delete(shipDuty).where(eq(shipDuty.id, id));
    return !!result.rowCount;
  }
  
  // Bill operations
  async getAllBills(): Promise<Bill[]> {
    return await db.select().from(bills);
  }
  
  async getBill(id: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }
  
  async getBillByBillNumber(billNumber: string): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.billNumber, billNumber));
    return bill;
  }
  
  async getBillsByProjectId(projectId: number): Promise<Bill[]> {
    return await db.select().from(bills).where(eq(bills.projectId, projectId));
  }
  
  async getBillsByClientName(clientName: string): Promise<Bill[]> {
    return await db.select().from(bills).where(eq(bills.clientName, clientName));
  }
  
  async getBillsByDateRange(startDate: Date, endDate: Date): Promise<Bill[]> {
    return await db.select().from(bills).where(
      and(
        gte(bills.billDate, startDate),
        lte(bills.billDate, endDate)
      )
    );
  }
  
  async getBillsByStatus(status: string): Promise<Bill[]> {
    return await db.select().from(bills).where(eq(bills.status, status));
  }
  
  async createBill(bill: InsertBill): Promise<Bill> {
    // Calculate dueAmount from grossAmount if not set
    const dueAmount = bill.netPayable - (bill.paidAmount || 0);
    const [newBill] = await db.insert(bills).values({...bill, dueAmount}).returning();
    return newBill;
  }
  
  async updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill | undefined> {
    // Recalculate dueAmount if netPayable or paidAmount was updated
    let updatedValues = {...bill};
    
    if (bill.netPayable !== undefined || bill.paidAmount !== undefined) {
      const existingBill = await this.getBill(id);
      if (existingBill) {
        const netPayable = bill.netPayable !== undefined ? bill.netPayable : existingBill.netPayable;
        const paidAmount = bill.paidAmount !== undefined ? bill.paidAmount : existingBill.paidAmount;
        updatedValues.dueAmount = netPayable - paidAmount;
      }
    }
    
    const [updatedBill] = await db
      .update(bills)
      .set(updatedValues)
      .where(eq(bills.id, id))
      .returning();
    
    return updatedBill;
  }
  
  async updateBillStatus(id: number, status: string): Promise<Bill | undefined> {
    const [updatedBill] = await db
      .update(bills)
      .set({ status })
      .where(eq(bills.id, id))
      .returning();
    
    return updatedBill;
  }
  
  async deleteBill(id: number): Promise<boolean> {
    const result = await db.delete(bills).where(eq(bills.id, id));
    return !!result.rowCount;
  }
  
  // Bill Payment operations
  async getAllBillPayments(): Promise<BillPayment[]> {
    return await db.select().from(billPayments);
  }
  
  async getBillPayment(id: number): Promise<BillPayment | undefined> {
    const [payment] = await db.select().from(billPayments).where(eq(billPayments.id, id));
    return payment;
  }
  
  async getBillPaymentsByBillId(billId: number): Promise<BillPayment[]> {
    return await db.select().from(billPayments).where(eq(billPayments.billId, billId));
  }
  
  async createBillPayment(payment: InsertBillPayment): Promise<BillPayment> {
    const [newPayment] = await db.insert(billPayments).values(payment).returning();
    
    // Update the bill's paidAmount and dueAmount
    const bill = await this.getBill(payment.billId);
    if (bill) {
      const newPaidAmount = Number(bill.paidAmount) + Number(payment.amount);
      const newDueAmount = Number(bill.netPayable) - newPaidAmount;
      
      await this.updateBill(payment.billId, { 
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        status: newDueAmount <= 0 ? 'Paid' : bill.status
      });
    }
    
    return newPayment;
  }
  
  async updateBillPayment(id: number, payment: Partial<InsertBillPayment>): Promise<BillPayment | undefined> {
    // If we're updating the amount, we need to update the bill's paidAmount and dueAmount
    const existingPayment = await this.getBillPayment(id);
    
    if (existingPayment && payment.amount && payment.amount !== existingPayment.amount) {
      const amountDifference = Number(payment.amount) - Number(existingPayment.amount);
      
      // Update the bill
      const bill = await this.getBill(existingPayment.billId);
      if (bill) {
        const newPaidAmount = Number(bill.paidAmount) + amountDifference;
        const newDueAmount = Number(bill.netPayable) - newPaidAmount;
        
        await this.updateBill(existingPayment.billId, { 
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: newDueAmount <= 0 ? 'Paid' : bill.status
        });
      }
    }
    
    const [updatedPayment] = await db
      .update(billPayments)
      .set(payment)
      .where(eq(billPayments.id, id))
      .returning();
    
    return updatedPayment;
  }
  
  async deleteBillPayment(id: number): Promise<boolean> {
    // First, get the payment details so we can update the bill
    const payment = await this.getBillPayment(id);
    
    if (payment) {
      // Update the bill to reduce the paidAmount
      const bill = await this.getBill(payment.billId);
      if (bill) {
        const newPaidAmount = Number(bill.paidAmount) - Number(payment.amount);
        const newDueAmount = Number(bill.netPayable) - newPaidAmount;
        
        await this.updateBill(payment.billId, { 
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: 'Draft' // Reset to draft if a payment is deleted
        });
      }
    }
    
    const result = await db.delete(billPayments).where(eq(billPayments.id, id));
    return !!result.rowCount;
  }
  
  // Report methods for ship duty and bills
  async getShipDutyRecords(filters?: any): Promise<any[]> {
    try {
      let query = db.select({
        id: shipDuty.id,
        projectId: shipDuty.projectId,
        employeeId: shipDuty.employeeId,
        vesselName: shipDuty.vesselName,
        lighterName: shipDuty.lighterName,
        dutyDate: shipDuty.dutyDate,
        dutyHours: shipDuty.dutyHours,
        releasePoint: shipDuty.releasePoint,
        salaryRate: shipDuty.salaryRate,
        conveyanceAmount: shipDuty.conveyanceAmount,
        remarks: shipDuty.remarks,
      })
      .from(shipDuty)
      .leftJoin(employees, eq(shipDuty.employeeId, employees.id))
      .leftJoin(projects, eq(shipDuty.projectId, projects.id));
      
      if (filters) {
        if (filters.startDate && filters.endDate) {
          query = query.where(
            and(
              gte(shipDuty.dutyDate, filters.startDate),
              lte(shipDuty.dutyDate, filters.endDate)
            )
          );
        } else if (filters.dutyDate) {
          query = query.where(eq(shipDuty.dutyDate, filters.dutyDate));
        }
        
        if (filters.employeeId) {
          query = query.where(eq(shipDuty.employeeId, filters.employeeId));
        }
        
        if (filters.projectId) {
          query = query.where(eq(shipDuty.projectId, filters.projectId));
        }
        
        if (filters.vesselName) {
          query = query.where(eq(shipDuty.vesselName, filters.vesselName));
        }
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting ship duty records:', error);
      return [];
    }
  }
  
  async getBillRecords(filters?: any): Promise<any[]> {
    try {
      let query = db.select({
        id: bills.id,
        billNumber: bills.billNumber,
        projectId: bills.projectId,
        clientName: bills.clientName,
        billDate: bills.billDate,
        startDate: bills.startDate,
        endDate: bills.endDate,
        totalDutyAmount: bills.totalDutyAmount,
        totalConveyance: bills.totalConveyance,
        vatPercentage: bills.vatPercentage,
        aitPercentage: bills.aitPercentage,
        vatAmount: bills.vatAmount,
        aitAmount: bills.aitAmount,
        grossAmount: bills.grossAmount,
        netPayable: bills.netPayable,
        paidAmount: bills.paidAmount,
        dueAmount: bills.dueAmount,
        status: bills.status,
        billDetails: bills.billDetails,
      })
      .from(bills)
      .leftJoin(projects, eq(bills.projectId, projects.id));
      
      if (filters) {
        if (filters.startDate && filters.endDate) {
          query = query.where(
            and(
              gte(bills.billDate, filters.startDate),
              lte(bills.billDate, filters.endDate)
            )
          );
        } else if (filters.billDate) {
          query = query.where(eq(bills.billDate, filters.billDate));
        }
        
        if (filters.projectId) {
          query = query.where(eq(bills.projectId, filters.projectId));
        }
        
        if (filters.clientName) {
          query = query.where(eq(bills.clientName, filters.clientName));
        }
        
        if (filters.status) {
          query = query.where(eq(bills.status, filters.status));
        }
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting bill records:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();