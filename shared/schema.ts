import { pgTable, text, serial, integer, date, time, boolean, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("firstname").notNull(),
  lastName: text("lastname").notNull(),
  fullName: text("fullname").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Will store hashed password
  role: text("role").notNull().default("viewer"), // 'admin', 'hr', or 'viewer'
  employeeId: text("employeeid").notNull(),
  createdAt: timestamp("createdat").defaultNow(),
  isActive: boolean("isactive").default(false), // Start inactive to require admin approval
  permissions: jsonb("permissions").default("{}"), // Custom permissions for menu visibility
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  fullName: true, // Will be generated from firstName and lastName
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;


// Employee schema
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull(), // Custom employee ID (e.g., EMP-1001)
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  designation: text("designation").notNull(),
  dailyWage: numeric("daily_wage").notNull(),
  mobile: text("mobile").notNull(),
  address: text("address").notNull(),
  idNumber: text("id_number"), // NID/Passport
  joinDate: date("join_date").notNull(),
  projectId: integer("project_id"),
  isActive: boolean("is_active").default(true),
  loanAdvance: numeric("loan_advance").default("0"), // Loan/Advance amount
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
});

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
});

// Attendance schema
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  projectId: integer("project_id").notNull(),
  date: date("date").notNull(),
  status: text("status").notNull(), // Present, Absent, Late
  checkInTime: time("check_in_time"),
  checkOutTime: time("check_out_time"),
  remarks: text("remarks"),
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
});

// Daily Expenditure schema
export const dailyExpenditure = pgTable("daily_expenditure", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().defaultNow(),
  employeeId: integer("employee_id").notNull(),
  payment: numeric("payment").default("0"),
  loanAdvance: numeric("loan_advance").default("0"),
  remarks: text("remarks"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertDailyExpenditureSchema = createInsertSchema(dailyExpenditure).omit({
  id: true,
  timestamp: true,
});

// Cash Receive schema
export const dailyIncome = pgTable("daily_income", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().defaultNow(),
  receivedFrom: text("received_from").notNull(),
  amount: numeric("amount").notNull(),
  description: text("description"),
  remarks: text("remarks"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertDailyIncomeSchema = createInsertSchema(dailyIncome).omit({
  id: true,
  timestamp: true,
});

// Payroll schema
export const payroll = pgTable("payroll", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  daysWorked: integer("days_worked").notNull(),
  basicAmount: numeric("basic_amount").notNull(),
  conveyanceAllowance: numeric("conveyance_allowance").default("0"),
  advancePayment: numeric("advance_payment").default("0"), // Cumulative from daily expenditure
  fines: numeric("fines").default("0"),
  totalAmount: numeric("total_amount").notNull(), // Basic + Allowances
  payableSalary: numeric("payable_salary").notNull(), // Total - Advance - Fines
  paymentDate: date("payment_date"),
  status: text("status").notNull(), // Pending, Completed
  remarks: text("remarks"),
  processedBy: text("processed_by"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertPayrollSchema = createInsertSchema(payroll).omit({
  id: true,
  timestamp: true,
});

// Payment schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  payrollId: integer("payroll_id").notNull(),
  amount: numeric("amount").notNull(),
  date: date("date").notNull(),
  method: text("method").notNull(), // Cash, Bank Transfer
  reference: text("reference"),
  status: text("status").notNull(), // Pending, Completed
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
});

// Dashboard stats
export const dashboardStats = pgTable("dashboard_stats", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  totalEmployees: integer("total_employees").notNull(),
  presentEmployees: integer("present_employees").notNull(),
  absentEmployees: integer("absent_employees").notNull(),
  lateEmployees: integer("late_employees").notNull(),
  activeProjects: integer("active_projects").notNull(),
  totalPayroll: numeric("total_payroll").notNull(),
});

export const insertDashboardStatsSchema = createInsertSchema(dashboardStats).omit({
  id: true,
});

// Define the types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type DailyExpenditure = typeof dailyExpenditure.$inferSelect;
export type InsertDailyExpenditure = z.infer<typeof insertDailyExpenditureSchema>;

export type DailyIncome = typeof dailyIncome.$inferSelect;
export type InsertDailyIncome = z.infer<typeof insertDailyIncomeSchema>;

export type Payroll = typeof payroll.$inferSelect;
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type DashboardStats = typeof dashboardStats.$inferSelect;
export type InsertDashboardStats = z.infer<typeof insertDashboardStatsSchema>;

// Company Settings schema
export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("HR & Payroll Management"),
  companyTagline: text("company_tagline").default("Manage your workforce efficiently"),
  primaryColor: text("primary_color").notNull().default("#2C5282"),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
});

export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
