import { pgTable, text, serial, integer, boolean, jsonb, timestamp, date, real, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Employee table
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  department: text("department").notNull(),
  position: text("position").notNull(),
  joinDate: date("join_date").notNull(),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  taxId: text("tax_id"),
  socialSecurityNumber: text("social_security_number"),
  status: text("status").notNull().default("active"),
});

// Salary structure table
export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  applicableDepartments: text("applicable_departments").array(),
  effectiveDate: date("effective_date").notNull(),
  status: text("status").notNull().default("active"),
});

// Salary components table
export const salaryComponents = pgTable("salary_components", {
  id: serial("id").primaryKey(),
  structureId: integer("structure_id").notNull().references(() => salaryStructures.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // fixed, variable, deduction
  amount: real("amount"), // Can be null if formula-based
  formula: text("formula"), // Can be null if fixed amount
  taxable: boolean("taxable").notNull().default(true),
  description: text("description"),
});

// Employee-Structure mapping table
export const employeeSalaryStructures = pgTable("employee_salary_structures", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  structureId: integer("structure_id").notNull().references(() => salaryStructures.id),
  effectiveDate: date("effective_date").notNull(),
  endDate: date("end_date"),
});

// Employee-specific component overrides
export const employeeComponentOverrides = pgTable("employee_component_overrides", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  componentId: integer("component_id").notNull().references(() => salaryComponents.id),
  amount: real("amount"),
  formula: text("formula"),
});

// Payroll period table
export const payrollPeriods = pgTable("payroll_periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  payDate: date("pay_date").notNull(),
  status: text("status").notNull().default("draft"), // draft, processing, completed
  runDate: date("run_date"),
});

// Payroll entries table (for each employee's payroll in a period)
export const payrollEntries = pgTable("payroll_entries", {
  id: serial("id").primaryKey(),
  periodId: integer("period_id").notNull().references(() => payrollPeriods.id),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  grossAmount: real("gross_amount").notNull(),
  netAmount: real("net_amount").notNull(),
  deductions: real("deductions").notNull(),
  calculationDetails: jsonb("calculation_details").notNull(),
  status: text("status").notNull().default("pending"), // pending, processed, paid
});

// Benefits table
export const benefits = pgTable("benefits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  type: text("type").notNull(), // health, retirement, allowance, etc.
  status: text("status").notNull().default("active"),
});

// Employee benefits enrollment
export const employeeBenefits = pgTable("employee_benefits", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  benefitId: integer("benefit_id").notNull().references(() => benefits.id),
  enrollmentDate: date("enrollment_date").notNull(),
  endDate: date("end_date"),
  details: jsonb("details"), // Flexible field for benefit-specific details
});

// Tax rates table
export const taxRates = pgTable("tax_rates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  rate: real("rate").notNull(),
  thresholdLower: real("threshold_lower"),
  thresholdUpper: real("threshold_upper"),
  effectiveDate: date("effective_date").notNull(),
  endDate: date("end_date"),
});

// Audit logs for payroll changes
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // employee, salary, payroll, etc.
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(), // create, update, delete
  changedBy: integer("changed_by").notNull(),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  changeDetails: jsonb("change_details").notNull(),
});

// 用户表定义
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  password: text("password"), // 本地用户密码（可选）
  role: text("role").notNull().default("employee"), // admin, manager, employee
  department: text("department"),
  position: text("position"),
  avatarUrl: text("avatar_url"),
  ssoId: text("sso_id").unique(), // SSO用户的唯一标识
  tenantId: integer("tenant_id").default(1),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 会话表定义（用于express-session存储）
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Insert schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export const insertSalaryStructureSchema = createInsertSchema(salaryStructures).omit({ id: true });
export const insertSalaryComponentSchema = createInsertSchema(salaryComponents).omit({ id: true });
export const insertEmployeeSalaryStructureSchema = createInsertSchema(employeeSalaryStructures).omit({ id: true });
export const insertEmployeeComponentOverrideSchema = createInsertSchema(employeeComponentOverrides).omit({ id: true });
export const insertPayrollPeriodSchema = createInsertSchema(payrollPeriods).omit({ id: true });
export const insertPayrollEntrySchema = createInsertSchema(payrollEntries).omit({ id: true });
export const insertBenefitSchema = createInsertSchema(benefits).omit({ id: true });
export const insertEmployeeBenefitSchema = createInsertSchema(employeeBenefits).omit({ id: true });
export const insertTaxRateSchema = createInsertSchema(taxRates).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

// Types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type InsertSalaryStructure = z.infer<typeof insertSalaryStructureSchema>;

export type SalaryComponent = typeof salaryComponents.$inferSelect;
export type InsertSalaryComponent = z.infer<typeof insertSalaryComponentSchema>;

export type EmployeeSalaryStructure = typeof employeeSalaryStructures.$inferSelect;
export type InsertEmployeeSalaryStructure = z.infer<typeof insertEmployeeSalaryStructureSchema>;

export type EmployeeComponentOverride = typeof employeeComponentOverrides.$inferSelect;
export type InsertEmployeeComponentOverride = z.infer<typeof insertEmployeeComponentOverrideSchema>;

export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type InsertPayrollPeriod = z.infer<typeof insertPayrollPeriodSchema>;

export type PayrollEntry = typeof payrollEntries.$inferSelect;
export type InsertPayrollEntry = z.infer<typeof insertPayrollEntrySchema>;

export type Benefit = typeof benefits.$inferSelect;
export type InsertBenefit = z.infer<typeof insertBenefitSchema>;

export type EmployeeBenefit = typeof employeeBenefits.$inferSelect;
export type InsertEmployeeBenefit = z.infer<typeof insertEmployeeBenefitSchema>;

export type TaxRate = typeof taxRates.$inferSelect;
export type InsertTaxRate = z.infer<typeof insertTaxRateSchema>;

// 导出类型
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Extended schemas with additional validation for forms
export const extendedEmployeeSchema = insertEmployeeSchema.extend({
  email: z.string().email("Please enter a valid email address"),
});

export const extendedSalaryComponentSchema = insertSalaryComponentSchema.extend({
  type: z.enum(["fixed", "variable", "deduction"], {
    errorMap: () => ({ message: "Component type must be fixed, variable, or deduction" }),
  }),
});

export const extendedUserSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "payroll_manager", "employee"], {
    errorMap: () => ({ message: "Role must be admin, payroll_manager, or employee" }),
  }),
});