import { 
  Employee, InsertEmployee, 
  Project, InsertProject,
  Attendance, InsertAttendance,
  DailyExpenditure, InsertDailyExpenditure,
  DailyIncome, InsertDailyIncome,
  Payroll, InsertPayroll,
  Payment, InsertPayment,
  DashboardStats, InsertDashboardStats,
} from "@shared/schema";

export interface IStorage {
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

export class MemStorage implements IStorage {
  private employees: Map<number, Employee>;
  private projects: Map<number, Project>;
  private attendance: Map<number, Attendance>;
  private dailyExpenditures: Map<number, DailyExpenditure>;
  private dailyIncomes: Map<number, DailyIncome>;
  private payrolls: Map<number, Payroll>;
  private payments: Map<number, Payment>;
  private dashboardStats: DashboardStats | undefined;
  
  private employeeIdCounter: number;
  private projectIdCounter: number;
  private attendanceIdCounter: number;
  private dailyExpenditureIdCounter: number;
  private dailyIncomeIdCounter: number;
  private payrollIdCounter: number;
  private paymentIdCounter: number;
  
  constructor() {
    this.employees = new Map();
    this.projects = new Map();
    this.attendance = new Map();
    this.dailyExpenditures = new Map();
    this.dailyIncomes = new Map();
    this.payrolls = new Map();
    this.payments = new Map();
    
    this.employeeIdCounter = 1;
    this.projectIdCounter = 1;
    this.attendanceIdCounter = 1;
    this.dailyExpenditureIdCounter = 1;
    this.dailyIncomeIdCounter = 1;
    this.payrollIdCounter = 1;
    this.paymentIdCounter = 1;
    
    // Initialize with sample data
    this.initializeData();
  }
  
  private initializeData() {
    // Add a few sample projects
    const projects: InsertProject[] = [
      {
        name: "Project A",
        location: "North Site",
        startDate: new Date("2023-01-01"),
        isActive: true,
      },
      {
        name: "Project B",
        location: "South Site",
        startDate: new Date("2023-02-15"),
        isActive: true,
      },
    ];
    
    projects.forEach(project => this.createProject(project));
    
    // Add sample employees
    const employees: InsertEmployee[] = [
      {
        employeeId: "EMP-1001",
        firstName: "Ahmed",
        lastName: "Hassan",
        designation: "Mason",
        dailyWage: "125.50",
        mobile: "+1234567890",
        address: "123 Main St, City",
        idNumber: "ID12345",
        joinDate: new Date("2022-10-15"),
        projectId: 1,
        isActive: true,
      },
      {
        employeeId: "EMP-1002",
        firstName: "Sara",
        lastName: "Ali",
        designation: "Painter",
        dailyWage: "118.75",
        mobile: "+9876543210",
        address: "456 Oak St, City",
        idNumber: "ID67890",
        joinDate: new Date("2022-11-20"),
        projectId: 1,
        isActive: true,
      },
      {
        employeeId: "EMP-1003",
        firstName: "Rahim",
        lastName: "Khan",
        designation: "Laborer",
        dailyWage: "130.00",
        mobile: "+1122334455",
        address: "789 Pine St, City",
        idNumber: "ID54321",
        joinDate: new Date("2023-01-05"),
        projectId: 2,
        isActive: true,
      },
    ];
    
    employees.forEach(employee => this.createEmployee(employee));
    
    // Create sample attendance records for today
    const today = new Date();
    
    const attendanceRecords: InsertAttendance[] = [
      {
        employeeId: 1,
        projectId: 1,
        date: today,
        status: "Present",
        checkInTime: "08:00:00",
      },
      {
        employeeId: 2,
        projectId: 1,
        date: today,
        status: "Present",
        checkInTime: "08:15:00",
      },
      {
        employeeId: 3,
        projectId: 2,
        date: today,
        status: "Absent",
      },
    ];
    
    attendanceRecords.forEach(record => this.createAttendance(record));
    
    // Create sample payroll records
    const payrollRecords: InsertPayroll[] = [
      {
        employeeId: 1,
        startDate: new Date(today.getFullYear(), today.getMonth(), 1),
        endDate: new Date(today.getFullYear(), today.getMonth(), 15),
        daysWorked: 12,
        basicAmount: "1506.00",
        conveyanceAllowance: "100.00",
        totalAmount: "1606.00",
        status: "Completed",
        paymentDate: today,
        processedBy: "Admin",
      },
      {
        employeeId: 2,
        startDate: new Date(today.getFullYear(), today.getMonth(), 1),
        endDate: new Date(today.getFullYear(), today.getMonth(), 15),
        daysWorked: 10,
        basicAmount: "1187.50",
        conveyanceAllowance: "80.00",
        totalAmount: "1267.50",
        status: "Completed",
        paymentDate: today,
        processedBy: "Admin",
      },
    ];
    
    payrollRecords.forEach(record => this.createPayroll(record));
    
    // Create sample payments
    const paymentRecords: InsertPayment[] = [
      {
        payrollId: 1,
        amount: "1606.00",
        date: today,
        method: "Cash",
        status: "Completed",
      },
      {
        payrollId: 2,
        amount: "1267.50",
        date: today,
        method: "Cash",
        status: "Completed",
      },
    ];
    
    paymentRecords.forEach(record => this.createPayment(record));
    
    // Create sample daily expenditure records
    const dailyExpenditureRecords: InsertDailyExpenditure[] = [
      {
        date: today,
        employeeId: 1,
        payment: "500.00",
        loanAdvance: "200.00",
        remarks: "Advance payment for tools"
      },
      {
        date: today,
        employeeId: 2,
        payment: "450.00",
        loanAdvance: "100.00",
        remarks: "Weekly payment"
      }
    ];
    
    dailyExpenditureRecords.forEach(record => this.createDailyExpenditure(record));
    
    // Create sample daily income records
    const dailyIncomeRecords: InsertDailyIncome[] = [
      {
        date: today,
        receivedFrom: "Client A",
        amount: "5000.00",
        description: "Project advance payment",
        remarks: "First installment"
      },
      {
        date: today,
        receivedFrom: "Client B",
        amount: "2500.00",
        description: "Material reimbursement",
        remarks: "For Project B"
      }
    ];
    
    dailyIncomeRecords.forEach(record => this.createDailyIncome(record));
    
    // Initialize dashboard stats
    const stats: InsertDashboardStats = {
      date: today,
      totalEmployees: 3,
      presentEmployees: 2,
      absentEmployees: 1,
      lateEmployees: 0,
      activeProjects: 2,
      totalPayroll: "2873.50",
    };
    
    this.createOrUpdateDashboardStats(stats);
  }
  
  // Employee operations
  async getAllEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }
  
  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employees.get(id);
  }
  
  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(
      (employee) => employee.employeeId === employeeId
    );
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = this.employeeIdCounter++;
    const newEmployee = { ...employee, id };
    this.employees.set(id, newEmployee);
    return newEmployee;
  }
  
  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const existingEmployee = this.employees.get(id);
    if (!existingEmployee) return undefined;
    
    const updatedEmployee = { ...existingEmployee, ...employee };
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }
  
  async deleteEmployee(id: number): Promise<boolean> {
    return this.employees.delete(id);
  }
  
  // Project operations
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectIdCounter++;
    const newProject = { ...project, id };
    this.projects.set(id, newProject);
    return newProject;
  }
  
  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) return undefined;
    
    const updatedProject = { ...existingProject, ...project };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }
  
  // Attendance operations
  async getAllAttendance(): Promise<Attendance[]> {
    return Array.from(this.attendance.values());
  }
  
  async getAttendance(id: number): Promise<Attendance | undefined> {
    return this.attendance.get(id);
  }
  
  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    const dateString = date.toISOString().split('T')[0];
    return Array.from(this.attendance.values()).filter(
      (record) => record.date.toISOString().split('T')[0] === dateString
    );
  }
  
  async getAttendanceByEmployeeId(employeeId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      (record) => record.employeeId === employeeId
    );
  }
  
  async getAttendanceByProjectId(projectId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      (record) => record.projectId === projectId
    );
  }
  
  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const id = this.attendanceIdCounter++;
    const newAttendance = { ...attendance, id };
    this.attendance.set(id, newAttendance);
    return newAttendance;
  }
  
  async updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const existingAttendance = this.attendance.get(id);
    if (!existingAttendance) return undefined;
    
    const updatedAttendance = { ...existingAttendance, ...attendance };
    this.attendance.set(id, updatedAttendance);
    return updatedAttendance;
  }
  
  async deleteAttendance(id: number): Promise<boolean> {
    return this.attendance.delete(id);
  }
  
  // Daily Expenditure operations
  async getAllDailyExpenditures(): Promise<DailyExpenditure[]> {
    return Array.from(this.dailyExpenditures.values());
  }
  
  async getDailyExpenditure(id: number): Promise<DailyExpenditure | undefined> {
    return this.dailyExpenditures.get(id);
  }
  
  async getDailyExpendituresByDate(date: Date): Promise<DailyExpenditure[]> {
    const dateString = date.toISOString().split('T')[0];
    return Array.from(this.dailyExpenditures.values()).filter(
      (record) => {
        if (typeof record.date === 'string') {
          return record.date.split('T')[0] === dateString;
        } else {
          return record.date.toISOString().split('T')[0] === dateString;
        }
      }
    );
  }
  
  async getDailyExpendituresByEmployeeId(employeeId: number): Promise<DailyExpenditure[]> {
    return Array.from(this.dailyExpenditures.values()).filter(
      (record) => record.employeeId === employeeId
    );
  }
  
  async getLoanAdvancesByEmployeeId(employeeId: number): Promise<number> {
    const records = await this.getDailyExpendituresByEmployeeId(employeeId);
    return records.reduce(
      (total, record) => total + parseFloat(record.loanAdvance.toString() || "0"), 
      0
    );
  }
  
  async createDailyExpenditure(expenditure: InsertDailyExpenditure): Promise<DailyExpenditure> {
    const id = this.dailyExpenditureIdCounter++;
    const newExpenditure = { ...expenditure, id, timestamp: new Date() };
    this.dailyExpenditures.set(id, newExpenditure);
    return newExpenditure;
  }
  
  async updateDailyExpenditure(id: number, expenditure: Partial<InsertDailyExpenditure>): Promise<DailyExpenditure | undefined> {
    const existingExpenditure = this.dailyExpenditures.get(id);
    if (!existingExpenditure) return undefined;
    
    const updatedExpenditure = { ...existingExpenditure, ...expenditure };
    this.dailyExpenditures.set(id, updatedExpenditure);
    return updatedExpenditure;
  }
  
  async deleteDailyExpenditure(id: number): Promise<boolean> {
    return this.dailyExpenditures.delete(id);
  }
  
  // Daily Income operations
  async getAllDailyIncomes(): Promise<DailyIncome[]> {
    return Array.from(this.dailyIncomes.values());
  }
  
  async getDailyIncome(id: number): Promise<DailyIncome | undefined> {
    return this.dailyIncomes.get(id);
  }
  
  async getDailyIncomesByDate(date: Date): Promise<DailyIncome[]> {
    const dateString = date.toISOString().split('T')[0];
    return Array.from(this.dailyIncomes.values()).filter(
      (record) => {
        if (typeof record.date === 'string') {
          return record.date.split('T')[0] === dateString;
        } else {
          return record.date.toISOString().split('T')[0] === dateString;
        }
      }
    );
  }
  
  async createDailyIncome(income: InsertDailyIncome): Promise<DailyIncome> {
    const id = this.dailyIncomeIdCounter++;
    const newIncome = { ...income, id, timestamp: new Date() };
    this.dailyIncomes.set(id, newIncome);
    return newIncome;
  }
  
  async updateDailyIncome(id: number, income: Partial<InsertDailyIncome>): Promise<DailyIncome | undefined> {
    const existingIncome = this.dailyIncomes.get(id);
    if (!existingIncome) return undefined;
    
    const updatedIncome = { ...existingIncome, ...income };
    this.dailyIncomes.set(id, updatedIncome);
    return updatedIncome;
  }
  
  async deleteDailyIncome(id: number): Promise<boolean> {
    return this.dailyIncomes.delete(id);
  }
  
  // Payroll operations
  async getAllPayrolls(): Promise<Payroll[]> {
    return Array.from(this.payrolls.values());
  }
  
  async getPayroll(id: number): Promise<Payroll | undefined> {
    return this.payrolls.get(id);
  }
  
  async getPayrollByEmployeeId(employeeId: number): Promise<Payroll[]> {
    return Array.from(this.payrolls.values()).filter(
      (record) => record.employeeId === employeeId
    );
  }
  
  async createPayroll(payroll: InsertPayroll): Promise<Payroll> {
    const id = this.payrollIdCounter++;
    const newPayroll = { ...payroll, id, timestamp: new Date() };
    this.payrolls.set(id, newPayroll);
    return newPayroll;
  }
  
  async updatePayroll(id: number, payroll: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    const existingPayroll = this.payrolls.get(id);
    if (!existingPayroll) return undefined;
    
    const updatedPayroll = { ...existingPayroll, ...payroll };
    this.payrolls.set(id, updatedPayroll);
    return updatedPayroll;
  }
  
  async deletePayroll(id: number): Promise<boolean> {
    return this.payrolls.delete(id);
  }
  
  // Payment operations
  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }
  
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async getPaymentsByPayrollId(payrollId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (record) => record.payrollId === payrollId
    );
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const newPayment = { ...payment, id };
    this.payments.set(id, newPayment);
    return newPayment;
  }
  
  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) return undefined;
    
    const updatedPayment = { ...existingPayment, ...payment };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  async deletePayment(id: number): Promise<boolean> {
    return this.payments.delete(id);
  }
  
  // Dashboard stats operations
  async getDashboardStats(): Promise<DashboardStats | undefined> {
    return this.dashboardStats;
  }
  
  async createOrUpdateDashboardStats(stats: InsertDashboardStats): Promise<DashboardStats> {
    const newStats = { ...stats, id: 1 };
    this.dashboardStats = newStats;
    return newStats;
  }
}

export const storage = new MemStorage();
