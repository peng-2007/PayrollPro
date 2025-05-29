import {
  employees, type Employee, type InsertEmployee,
  salaryStructures, type SalaryStructure, type InsertSalaryStructure,
  salaryComponents, type SalaryComponent, type InsertSalaryComponent,
  employeeSalaryStructures, type EmployeeSalaryStructure, type InsertEmployeeSalaryStructure,
  employeeComponentOverrides, type EmployeeComponentOverride, type InsertEmployeeComponentOverride,
  payrollPeriods, type PayrollPeriod, type InsertPayrollPeriod,
  payrollEntries, type PayrollEntry, type InsertPayrollEntry,
  benefits, type Benefit, type InsertBenefit,
  employeeBenefits, type EmployeeBenefit, type InsertEmployeeBenefit,
  taxRates, type TaxRate, type InsertTaxRate,
  users, type User, type NewUser as InsertUser,
  auditLogs
} from "@shared/schema";
import { db, pool } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Employee methods
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;

  // Salary structure methods
  getSalaryStructures(): Promise<SalaryStructure[]>;
  getSalaryStructure(id: number): Promise<SalaryStructure | undefined>;
  createSalaryStructure(structure: InsertSalaryStructure): Promise<SalaryStructure>;
  updateSalaryStructure(id: number, structure: Partial<InsertSalaryStructure>): Promise<SalaryStructure | undefined>;
  deleteSalaryStructure(id: number): Promise<boolean>;

  // Salary component methods
  getSalaryComponents(structureId?: number): Promise<SalaryComponent[]>;
  getSalaryComponent(id: number): Promise<SalaryComponent | undefined>;
  createSalaryComponent(component: InsertSalaryComponent): Promise<SalaryComponent>;
  updateSalaryComponent(id: number, component: Partial<InsertSalaryComponent>): Promise<SalaryComponent | undefined>;
  deleteSalaryComponent(id: number): Promise<boolean>;

  // Employee-Structure mapping methods
  getEmployeeSalaryStructures(employeeId?: number): Promise<EmployeeSalaryStructure[]>;
  assignSalaryStructure(mapping: InsertEmployeeSalaryStructure): Promise<EmployeeSalaryStructure>;
  updateEmployeeSalaryStructure(id: number, mapping: Partial<InsertEmployeeSalaryStructure>): Promise<EmployeeSalaryStructure | undefined>;
  
  // Employee component override methods
  getEmployeeComponentOverrides(employeeId: number): Promise<EmployeeComponentOverride[]>;
  setComponentOverride(override: InsertEmployeeComponentOverride): Promise<EmployeeComponentOverride>;
  updateComponentOverride(id: number, override: Partial<InsertEmployeeComponentOverride>): Promise<EmployeeComponentOverride | undefined>;
  deleteComponentOverride(id: number): Promise<boolean>;

  // Payroll period methods
  getPayrollPeriods(): Promise<PayrollPeriod[]>;
  getPayrollPeriod(id: number): Promise<PayrollPeriod | undefined>;
  createPayrollPeriod(period: InsertPayrollPeriod): Promise<PayrollPeriod>;
  updatePayrollPeriod(id: number, period: Partial<InsertPayrollPeriod>): Promise<PayrollPeriod | undefined>;

  // Payroll entry methods
  getPayrollEntries(periodId?: number, employeeId?: number): Promise<PayrollEntry[]>;
  getPayrollEntry(id: number): Promise<PayrollEntry | undefined>;
  createPayrollEntry(entry: InsertPayrollEntry): Promise<PayrollEntry>;
  updatePayrollEntry(id: number, entry: Partial<InsertPayrollEntry>): Promise<PayrollEntry | undefined>;

  // Benefit methods
  getBenefits(): Promise<Benefit[]>;
  getBenefit(id: number): Promise<Benefit | undefined>;
  createBenefit(benefit: InsertBenefit): Promise<Benefit>;
  updateBenefit(id: number, benefit: Partial<InsertBenefit>): Promise<Benefit | undefined>;
  deleteBenefit(id: number): Promise<boolean>;

  // Employee benefit methods
  getEmployeeBenefits(employeeId?: number): Promise<EmployeeBenefit[]>;
  enrollEmployeeBenefit(enrollment: InsertEmployeeBenefit): Promise<EmployeeBenefit>;
  updateEmployeeBenefit(id: number, enrollment: Partial<InsertEmployeeBenefit>): Promise<EmployeeBenefit | undefined>;
  terminateEmployeeBenefit(id: number, endDate: Date): Promise<EmployeeBenefit | undefined>;

  // Tax rate methods
  getTaxRates(): Promise<TaxRate[]>;
  createTaxRate(taxRate: InsertTaxRate): Promise<TaxRate>;
  updateTaxRate(id: number, taxRate: Partial<InsertTaxRate>): Promise<TaxRate | undefined>;

  // User methods
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Audit logs
  createAuditLog(entityType: string, entityId: number, action: string, changedBy: number, changeDetails: any): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private employees: Map<number, Employee>;
  private salaryStructures: Map<number, SalaryStructure>;
  private salaryComponents: Map<number, SalaryComponent>;
  private employeeSalaryStructures: Map<number, EmployeeSalaryStructure>;
  private employeeComponentOverrides: Map<number, EmployeeComponentOverride>;
  private payrollPeriods: Map<number, PayrollPeriod>;
  private payrollEntries: Map<number, PayrollEntry>;
  private benefits: Map<number, Benefit>;
  private employeeBenefits: Map<number, EmployeeBenefit>;
  private taxRates: Map<number, TaxRate>;
  private users: Map<number, User>;
  private auditLogs: any[];

  // Auto-increment IDs
  private employeeId: number;
  private structureId: number;
  private componentId: number;
  private mappingId: number;
  private overrideId: number;
  private periodId: number;
  private entryId: number;
  private benefitId: number;
  private benefitEnrollmentId: number;
  private taxRateId: number;
  private userId: number;
  private logId: number;

  constructor() {
    // Initialize maps
    this.employees = new Map();
    this.salaryStructures = new Map();
    this.salaryComponents = new Map();
    this.employeeSalaryStructures = new Map();
    this.employeeComponentOverrides = new Map();
    this.payrollPeriods = new Map();
    this.payrollEntries = new Map();
    this.benefits = new Map();
    this.employeeBenefits = new Map();
    this.taxRates = new Map();
    this.users = new Map();
    this.auditLogs = [];

    // Initialize IDs
    this.employeeId = 1;
    this.structureId = 1;
    this.componentId = 1;
    this.mappingId = 1;
    this.overrideId = 1;
    this.periodId = 1;
    this.entryId = 1;
    this.benefitId = 1;
    this.benefitEnrollmentId = 1;
    this.taxRateId = 1;
    this.userId = 1;
    this.logId = 1;

    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create a sample user
    const adminUser: InsertUser = {
      username: "admin",
      password: "admin123", // In production, this would be hashed
      role: "admin",
      status: "active"
    };
    this.createUser(adminUser);

    // Create sample employees
    const employee1: InsertEmployee = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      department: "Engineering",
      position: "Senior Developer",
      joinDate: new Date("2022-01-15"),
      bankName: "First National Bank",
      bankAccountNumber: "1234567890",
      taxId: "TX12345",
      socialSecurityNumber: "123-45-6789",
      status: "active"
    };
    const employee2: InsertEmployee = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      department: "Marketing",
      position: "Marketing Manager",
      joinDate: new Date("2021-05-10"),
      bankName: "City Bank",
      bankAccountNumber: "0987654321",
      taxId: "TX54321",
      socialSecurityNumber: "987-65-4321",
      status: "active"
    };
    this.createEmployee(employee1);
    this.createEmployee(employee2);

    // Create sample salary structure
    const structure: InsertSalaryStructure = {
      name: "Standard Employee Structure",
      description: "Default salary structure for all employees",
      applicableDepartments: ["Engineering", "Marketing", "Sales", "Finance", "Human Resources"],
      effectiveDate: new Date("2023-01-01"),
      status: "active"
    };
    const createdStructure = this.createSalaryStructure(structure);

    // Create sample salary components
    const baseSalary: InsertSalaryComponent = {
      structureId: createdStructure.id,
      name: "Base Salary",
      type: "fixed",
      amount: 5000,
      taxable: true,
      description: "Monthly base salary"
    };
    const bonus: InsertSalaryComponent = {
      structureId: createdStructure.id,
      name: "Performance Bonus",
      type: "variable",
      formula: "baseSalary * (performanceScore / 100) * 0.15",
      taxable: true,
      description: "Quarterly performance bonus"
    };
    const incomeTax: InsertSalaryComponent = {
      structureId: createdStructure.id,
      name: "Income Tax",
      type: "deduction",
      formula: "if(grossSalary <= 2000, grossSalary * 0.1, if(grossSalary <= 5000, grossSalary * 0.15, grossSalary * 0.2))",
      taxable: false,
      description: "Income tax based on tax brackets"
    };
    this.createSalaryComponent(baseSalary);
    this.createSalaryComponent(bonus);
    this.createSalaryComponent(incomeTax);

    // Assign salary structure to employees
    const mapping1: InsertEmployeeSalaryStructure = {
      employeeId: 1,
      structureId: createdStructure.id,
      effectiveDate: new Date("2023-01-01")
    };
    const mapping2: InsertEmployeeSalaryStructure = {
      employeeId: 2,
      structureId: createdStructure.id,
      effectiveDate: new Date("2023-01-01")
    };
    this.assignSalaryStructure(mapping1);
    this.assignSalaryStructure(mapping2);

    // Create sample payroll periods
    const period1: InsertPayrollPeriod = {
      name: "June 2023",
      startDate: new Date("2023-06-01"),
      endDate: new Date("2023-06-30"),
      payDate: new Date("2023-06-30"),
      status: "processing",
      runDate: new Date("2023-06-28")
    };
    const period2: InsertPayrollPeriod = {
      name: "May 2023",
      startDate: new Date("2023-05-01"),
      endDate: new Date("2023-05-31"),
      payDate: new Date("2023-05-31"),
      status: "completed",
      runDate: new Date("2023-05-28")
    };
    const period3: InsertPayrollPeriod = {
      name: "April 2023",
      startDate: new Date("2023-04-01"),
      endDate: new Date("2023-04-30"),
      payDate: new Date("2023-04-30"),
      status: "completed",
      runDate: new Date("2023-04-27")
    };
    this.createPayrollPeriod(period1);
    this.createPayrollPeriod(period2);
    this.createPayrollPeriod(period3);

    // Create sample benefits
    const healthBenefit: InsertBenefit = {
      name: "Health Insurance",
      description: "Company provided health insurance coverage",
      type: "health",
      status: "active"
    };
    const retirementBenefit: InsertBenefit = {
      name: "401(k) Plan",
      description: "Retirement savings plan with company matching",
      type: "retirement",
      status: "active"
    };
    this.createBenefit(healthBenefit);
    this.createBenefit(retirementBenefit);

    // Create sample tax rates
    const taxRate1: InsertTaxRate = {
      name: "Income Tax Bracket 1",
      description: "Income tax for salaries up to 2000",
      rate: 0.1,
      thresholdLower: 0,
      thresholdUpper: 2000,
      effectiveDate: new Date("2023-01-01")
    };
    const taxRate2: InsertTaxRate = {
      name: "Income Tax Bracket 2",
      description: "Income tax for salaries between 2001 and 5000",
      rate: 0.15,
      thresholdLower: 2001,
      thresholdUpper: 5000,
      effectiveDate: new Date("2023-01-01")
    };
    const taxRate3: InsertTaxRate = {
      name: "Income Tax Bracket 3",
      description: "Income tax for salaries above 5000",
      rate: 0.2,
      thresholdLower: 5001,
      effectiveDate: new Date("2023-01-01")
    };
    this.createTaxRate(taxRate1);
    this.createTaxRate(taxRate2);
    this.createTaxRate(taxRate3);
  }

  // Employee methods
  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = this.employeeId++;
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

  // Salary structure methods
  async getSalaryStructures(): Promise<SalaryStructure[]> {
    return Array.from(this.salaryStructures.values());
  }

  async getSalaryStructure(id: number): Promise<SalaryStructure | undefined> {
    return this.salaryStructures.get(id);
  }

  async createSalaryStructure(structure: InsertSalaryStructure): Promise<SalaryStructure> {
    const id = this.structureId++;
    const newStructure = { ...structure, id };
    this.salaryStructures.set(id, newStructure);
    return newStructure;
  }

  async updateSalaryStructure(id: number, structure: Partial<InsertSalaryStructure>): Promise<SalaryStructure | undefined> {
    const existingStructure = this.salaryStructures.get(id);
    if (!existingStructure) return undefined;
    
    const updatedStructure = { ...existingStructure, ...structure };
    this.salaryStructures.set(id, updatedStructure);
    return updatedStructure;
  }

  async deleteSalaryStructure(id: number): Promise<boolean> {
    return this.salaryStructures.delete(id);
  }

  // Salary component methods
  async getSalaryComponents(structureId?: number): Promise<SalaryComponent[]> {
    const components = Array.from(this.salaryComponents.values());
    if (structureId !== undefined) {
      return components.filter(c => c.structureId === structureId);
    }
    return components;
  }

  async getSalaryComponent(id: number): Promise<SalaryComponent | undefined> {
    return this.salaryComponents.get(id);
  }

  async createSalaryComponent(component: InsertSalaryComponent): Promise<SalaryComponent> {
    const id = this.componentId++;
    const newComponent = { ...component, id };
    this.salaryComponents.set(id, newComponent);
    return newComponent;
  }

  async updateSalaryComponent(id: number, component: Partial<InsertSalaryComponent>): Promise<SalaryComponent | undefined> {
    const existingComponent = this.salaryComponents.get(id);
    if (!existingComponent) return undefined;
    
    const updatedComponent = { ...existingComponent, ...component };
    this.salaryComponents.set(id, updatedComponent);
    return updatedComponent;
  }

  async deleteSalaryComponent(id: number): Promise<boolean> {
    return this.salaryComponents.delete(id);
  }

  // Employee-Structure mapping methods
  async getEmployeeSalaryStructures(employeeId?: number): Promise<EmployeeSalaryStructure[]> {
    const mappings = Array.from(this.employeeSalaryStructures.values());
    if (employeeId !== undefined) {
      return mappings.filter(m => m.employeeId === employeeId);
    }
    return mappings;
  }

  async assignSalaryStructure(mapping: InsertEmployeeSalaryStructure): Promise<EmployeeSalaryStructure> {
    const id = this.mappingId++;
    const newMapping = { ...mapping, id };
    this.employeeSalaryStructures.set(id, newMapping);
    return newMapping;
  }

  async updateEmployeeSalaryStructure(id: number, mapping: Partial<InsertEmployeeSalaryStructure>): Promise<EmployeeSalaryStructure | undefined> {
    const existingMapping = this.employeeSalaryStructures.get(id);
    if (!existingMapping) return undefined;
    
    const updatedMapping = { ...existingMapping, ...mapping };
    this.employeeSalaryStructures.set(id, updatedMapping);
    return updatedMapping;
  }

  // Employee component override methods
  async getEmployeeComponentOverrides(employeeId: number): Promise<EmployeeComponentOverride[]> {
    return Array.from(this.employeeComponentOverrides.values())
      .filter(o => o.employeeId === employeeId);
  }

  async setComponentOverride(override: InsertEmployeeComponentOverride): Promise<EmployeeComponentOverride> {
    const id = this.overrideId++;
    const newOverride = { ...override, id };
    this.employeeComponentOverrides.set(id, newOverride);
    return newOverride;
  }

  async updateComponentOverride(id: number, override: Partial<InsertEmployeeComponentOverride>): Promise<EmployeeComponentOverride | undefined> {
    const existingOverride = this.employeeComponentOverrides.get(id);
    if (!existingOverride) return undefined;
    
    const updatedOverride = { ...existingOverride, ...override };
    this.employeeComponentOverrides.set(id, updatedOverride);
    return updatedOverride;
  }

  async deleteComponentOverride(id: number): Promise<boolean> {
    return this.employeeComponentOverrides.delete(id);
  }

  // Payroll period methods
  async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    return Array.from(this.payrollPeriods.values());
  }

  async getPayrollPeriod(id: number): Promise<PayrollPeriod | undefined> {
    return this.payrollPeriods.get(id);
  }

  async createPayrollPeriod(period: InsertPayrollPeriod): Promise<PayrollPeriod> {
    const id = this.periodId++;
    const newPeriod = { ...period, id };
    this.payrollPeriods.set(id, newPeriod);
    return newPeriod;
  }

  async updatePayrollPeriod(id: number, period: Partial<InsertPayrollPeriod>): Promise<PayrollPeriod | undefined> {
    const existingPeriod = this.payrollPeriods.get(id);
    if (!existingPeriod) return undefined;
    
    const updatedPeriod = { ...existingPeriod, ...period };
    this.payrollPeriods.set(id, updatedPeriod);
    return updatedPeriod;
  }

  // Payroll entry methods
  async getPayrollEntries(periodId?: number, employeeId?: number): Promise<PayrollEntry[]> {
    let entries = Array.from(this.payrollEntries.values());
    
    if (periodId !== undefined) {
      entries = entries.filter(e => e.periodId === periodId);
    }
    
    if (employeeId !== undefined) {
      entries = entries.filter(e => e.employeeId === employeeId);
    }
    
    return entries;
  }

  async getPayrollEntry(id: number): Promise<PayrollEntry | undefined> {
    return this.payrollEntries.get(id);
  }

  async createPayrollEntry(entry: InsertPayrollEntry): Promise<PayrollEntry> {
    const id = this.entryId++;
    const newEntry = { ...entry, id };
    this.payrollEntries.set(id, newEntry);
    return newEntry;
  }

  async updatePayrollEntry(id: number, entry: Partial<InsertPayrollEntry>): Promise<PayrollEntry | undefined> {
    const existingEntry = this.payrollEntries.get(id);
    if (!existingEntry) return undefined;
    
    const updatedEntry = { ...existingEntry, ...entry };
    this.payrollEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  // Benefit methods
  async getBenefits(): Promise<Benefit[]> {
    return Array.from(this.benefits.values());
  }

  async getBenefit(id: number): Promise<Benefit | undefined> {
    return this.benefits.get(id);
  }

  async createBenefit(benefit: InsertBenefit): Promise<Benefit> {
    const id = this.benefitId++;
    const newBenefit = { ...benefit, id };
    this.benefits.set(id, newBenefit);
    return newBenefit;
  }

  async updateBenefit(id: number, benefit: Partial<InsertBenefit>): Promise<Benefit | undefined> {
    const existingBenefit = this.benefits.get(id);
    if (!existingBenefit) return undefined;
    
    const updatedBenefit = { ...existingBenefit, ...benefit };
    this.benefits.set(id, updatedBenefit);
    return updatedBenefit;
  }

  async deleteBenefit(id: number): Promise<boolean> {
    return this.benefits.delete(id);
  }

  // Employee benefit methods
  async getEmployeeBenefits(employeeId?: number): Promise<EmployeeBenefit[]> {
    const benefits = Array.from(this.employeeBenefits.values());
    if (employeeId !== undefined) {
      return benefits.filter(b => b.employeeId === employeeId);
    }
    return benefits;
  }

  async enrollEmployeeBenefit(enrollment: InsertEmployeeBenefit): Promise<EmployeeBenefit> {
    const id = this.benefitEnrollmentId++;
    const newEnrollment = { ...enrollment, id };
    this.employeeBenefits.set(id, newEnrollment);
    return newEnrollment;
  }

  async updateEmployeeBenefit(id: number, enrollment: Partial<InsertEmployeeBenefit>): Promise<EmployeeBenefit | undefined> {
    const existingEnrollment = this.employeeBenefits.get(id);
    if (!existingEnrollment) return undefined;
    
    const updatedEnrollment = { ...existingEnrollment, ...enrollment };
    this.employeeBenefits.set(id, updatedEnrollment);
    return updatedEnrollment;
  }

  async terminateEmployeeBenefit(id: number, endDate: Date): Promise<EmployeeBenefit | undefined> {
    const existingEnrollment = this.employeeBenefits.get(id);
    if (!existingEnrollment) return undefined;
    
    const updatedEnrollment = { ...existingEnrollment, endDate };
    this.employeeBenefits.set(id, updatedEnrollment);
    return updatedEnrollment;
  }

  // Tax rate methods
  async getTaxRates(): Promise<TaxRate[]> {
    return Array.from(this.taxRates.values());
  }

  async createTaxRate(taxRate: InsertTaxRate): Promise<TaxRate> {
    const id = this.taxRateId++;
    const newTaxRate = { ...taxRate, id };
    this.taxRates.set(id, newTaxRate);
    return newTaxRate;
  }

  async updateTaxRate(id: number, taxRate: Partial<InsertTaxRate>): Promise<TaxRate | undefined> {
    const existingTaxRate = this.taxRates.get(id);
    if (!existingTaxRate) return undefined;
    
    const updatedTaxRate = { ...existingTaxRate, ...taxRate };
    this.taxRates.set(id, updatedTaxRate);
    return updatedTaxRate;
  }

  // User methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Audit logs
  async createAuditLog(entityType: string, entityId: number, action: string, changedBy: number, changeDetails: any): Promise<void> {
    const id = this.logId++;
    const log = {
      id,
      entityType,
      entityId,
      action,
      changedBy,
      changedAt: new Date(),
      changeDetails
    };
    this.auditLogs.push(log);
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db
      .insert(employees)
      .values(employee)
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updatedEmployee] = await db
      .update(employees)
      .set(employee)
      .where(eq(employees.id, id))
      .returning();
    return updatedEmployee || undefined;
  }

  async deleteEmployee(id: number): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id));
    return result.rowCount > 0;
  }

  async getSalaryStructures(): Promise<SalaryStructure[]> {
    return await db.select().from(salaryStructures);
  }

  async getSalaryStructure(id: number): Promise<SalaryStructure | undefined> {
    const [structure] = await db.select().from(salaryStructures).where(eq(salaryStructures.id, id));
    return structure || undefined;
  }

  async createSalaryStructure(structure: InsertSalaryStructure): Promise<SalaryStructure> {
    const [newStructure] = await db
      .insert(salaryStructures)
      .values(structure)
      .returning();
    return newStructure;
  }

  async updateSalaryStructure(id: number, structure: Partial<InsertSalaryStructure>): Promise<SalaryStructure | undefined> {
    const [updatedStructure] = await db
      .update(salaryStructures)
      .set(structure)
      .where(eq(salaryStructures.id, id))
      .returning();
    return updatedStructure || undefined;
  }

  async deleteSalaryStructure(id: number): Promise<boolean> {
    const result = await db.delete(salaryStructures).where(eq(salaryStructures.id, id));
    return result.rowCount > 0;
  }

  async getSalaryComponents(structureId?: number): Promise<SalaryComponent[]> {
    if (structureId) {
      return await db.select().from(salaryComponents).where(eq(salaryComponents.structureId, structureId));
    }
    return await db.select().from(salaryComponents);
  }

  async getSalaryComponent(id: number): Promise<SalaryComponent | undefined> {
    const [component] = await db.select().from(salaryComponents).where(eq(salaryComponents.id, id));
    return component || undefined;
  }

  async createSalaryComponent(component: InsertSalaryComponent): Promise<SalaryComponent> {
    const [newComponent] = await db
      .insert(salaryComponents)
      .values(component)
      .returning();
    return newComponent;
  }

  async updateSalaryComponent(id: number, component: Partial<InsertSalaryComponent>): Promise<SalaryComponent | undefined> {
    const [updatedComponent] = await db
      .update(salaryComponents)
      .set(component)
      .where(eq(salaryComponents.id, id))
      .returning();
    return updatedComponent || undefined;
  }

  async deleteSalaryComponent(id: number): Promise<boolean> {
    const result = await db.delete(salaryComponents).where(eq(salaryComponents.id, id));
    return result.rowCount > 0;
  }

  async getEmployeeSalaryStructures(employeeId?: number): Promise<EmployeeSalaryStructure[]> {
    if (employeeId) {
      return await db.select().from(employeeSalaryStructures).where(eq(employeeSalaryStructures.employeeId, employeeId));
    }
    return await db.select().from(employeeSalaryStructures);
  }

  async assignSalaryStructure(mapping: InsertEmployeeSalaryStructure): Promise<EmployeeSalaryStructure> {
    const [newMapping] = await db
      .insert(employeeSalaryStructures)
      .values(mapping)
      .returning();
    return newMapping;
  }

  async updateEmployeeSalaryStructure(id: number, mapping: Partial<InsertEmployeeSalaryStructure>): Promise<EmployeeSalaryStructure | undefined> {
    const [updatedMapping] = await db
      .update(employeeSalaryStructures)
      .set(mapping)
      .where(eq(employeeSalaryStructures.id, id))
      .returning();
    return updatedMapping || undefined;
  }

  async getEmployeeComponentOverrides(employeeId: number): Promise<EmployeeComponentOverride[]> {
    return await db.select().from(employeeComponentOverrides).where(eq(employeeComponentOverrides.employeeId, employeeId));
  }

  async setComponentOverride(override: InsertEmployeeComponentOverride): Promise<EmployeeComponentOverride> {
    const [newOverride] = await db
      .insert(employeeComponentOverrides)
      .values(override)
      .returning();
    return newOverride;
  }

  async updateComponentOverride(id: number, override: Partial<InsertEmployeeComponentOverride>): Promise<EmployeeComponentOverride | undefined> {
    const [updatedOverride] = await db
      .update(employeeComponentOverrides)
      .set(override)
      .where(eq(employeeComponentOverrides.id, id))
      .returning();
    return updatedOverride || undefined;
  }

  async deleteComponentOverride(id: number): Promise<boolean> {
    const result = await db.delete(employeeComponentOverrides).where(eq(employeeComponentOverrides.id, id));
    return result.rowCount > 0;
  }

  async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    return await db.select().from(payrollPeriods);
  }

  async getPayrollPeriod(id: number): Promise<PayrollPeriod | undefined> {
    const [period] = await db.select().from(payrollPeriods).where(eq(payrollPeriods.id, id));
    return period || undefined;
  }

  async createPayrollPeriod(period: InsertPayrollPeriod): Promise<PayrollPeriod> {
    const [newPeriod] = await db
      .insert(payrollPeriods)
      .values(period)
      .returning();
    return newPeriod;
  }

  async updatePayrollPeriod(id: number, period: Partial<InsertPayrollPeriod>): Promise<PayrollPeriod | undefined> {
    const [updatedPeriod] = await db
      .update(payrollPeriods)
      .set(period)
      .where(eq(payrollPeriods.id, id))
      .returning();
    return updatedPeriod || undefined;
  }

  async getPayrollEntries(periodId?: number, employeeId?: number): Promise<PayrollEntry[]> {
    let query = db.select().from(payrollEntries);
    
    if (periodId && employeeId) {
      return await query.where(eq(payrollEntries.periodId, periodId) && eq(payrollEntries.employeeId, employeeId));
    } else if (periodId) {
      return await query.where(eq(payrollEntries.periodId, periodId));
    } else if (employeeId) {
      return await query.where(eq(payrollEntries.employeeId, employeeId));
    }
    
    return await query;
  }

  async getPayrollEntry(id: number): Promise<PayrollEntry | undefined> {
    const [entry] = await db.select().from(payrollEntries).where(eq(payrollEntries.id, id));
    return entry || undefined;
  }

  async createPayrollEntry(entry: InsertPayrollEntry): Promise<PayrollEntry> {
    const [newEntry] = await db
      .insert(payrollEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async updatePayrollEntry(id: number, entry: Partial<InsertPayrollEntry>): Promise<PayrollEntry | undefined> {
    const [updatedEntry] = await db
      .update(payrollEntries)
      .set(entry)
      .where(eq(payrollEntries.id, id))
      .returning();
    return updatedEntry || undefined;
  }

  async getBenefits(): Promise<Benefit[]> {
    return await db.select().from(benefits);
  }

  async getBenefit(id: number): Promise<Benefit | undefined> {
    const [benefit] = await db.select().from(benefits).where(eq(benefits.id, id));
    return benefit || undefined;
  }

  async createBenefit(benefit: InsertBenefit): Promise<Benefit> {
    const [newBenefit] = await db
      .insert(benefits)
      .values(benefit)
      .returning();
    return newBenefit;
  }

  async updateBenefit(id: number, benefit: Partial<InsertBenefit>): Promise<Benefit | undefined> {
    const [updatedBenefit] = await db
      .update(benefits)
      .set(benefit)
      .where(eq(benefits.id, id))
      .returning();
    return updatedBenefit || undefined;
  }

  async deleteBenefit(id: number): Promise<boolean> {
    const result = await db.delete(benefits).where(eq(benefits.id, id));
    return result.rowCount > 0;
  }

  async getEmployeeBenefits(employeeId?: number): Promise<EmployeeBenefit[]> {
    if (employeeId) {
      return await db.select().from(employeeBenefits).where(eq(employeeBenefits.employeeId, employeeId));
    }
    return await db.select().from(employeeBenefits);
  }

  async enrollEmployeeBenefit(enrollment: InsertEmployeeBenefit): Promise<EmployeeBenefit> {
    const [newEnrollment] = await db
      .insert(employeeBenefits)
      .values(enrollment)
      .returning();
    return newEnrollment;
  }

  async updateEmployeeBenefit(id: number, enrollment: Partial<InsertEmployeeBenefit>): Promise<EmployeeBenefit | undefined> {
    const [updatedEnrollment] = await db
      .update(employeeBenefits)
      .set(enrollment)
      .where(eq(employeeBenefits.id, id))
      .returning();
    return updatedEnrollment || undefined;
  }

  async terminateEmployeeBenefit(id: number, endDate: Date): Promise<EmployeeBenefit | undefined> {
    const [updatedEnrollment] = await db
      .update(employeeBenefits)
      .set({ endDate: endDate.toISOString() })
      .where(eq(employeeBenefits.id, id))
      .returning();
    return updatedEnrollment || undefined;
  }

  async getTaxRates(): Promise<TaxRate[]> {
    return await db.select().from(taxRates);
  }

  async createTaxRate(taxRate: InsertTaxRate): Promise<TaxRate> {
    const [newTaxRate] = await db
      .insert(taxRates)
      .values(taxRate)
      .returning();
    return newTaxRate;
  }

  async updateTaxRate(id: number, taxRate: Partial<InsertTaxRate>): Promise<TaxRate | undefined> {
    const [updatedTaxRate] = await db
      .update(taxRates)
      .set(taxRate)
      .where(eq(taxRates.id, id))
      .returning();
    return updatedTaxRate || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async createAuditLog(entityType: string, entityId: number, action: string, changedBy: number, changeDetails: any): Promise<void> {
    await db
      .insert(auditLogs)
      .values({
        entityType,
        entityId,
        action,
        changedBy,
        changeDetails
      });
  }
}

export const storage = new DatabaseStorage();
