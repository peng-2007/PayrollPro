import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertEmployeeSchema,
  insertSalaryStructureSchema,
  insertSalaryComponentSchema,
  insertEmployeeSalaryStructureSchema,
  insertEmployeeComponentOverrideSchema,
  insertPayrollPeriodSchema,
  insertPayrollEntrySchema,
  insertBenefitSchema,
  insertEmployeeBenefitSchema,
  insertTaxRateSchema,
  insertUserSchema,
  extendedEmployeeSchema,
  extendedSalaryComponentSchema,
  extendedUserSchema
} from "@shared/schema";
import { evaluate } from "mathjs";

// Helper function to validate payload against schema
function validatePayload<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware is now configured in ssoAuth.ts using PostgreSQL

  // Authentication middleware
  const authenticate = (req: Request, res: Response, next: Function) => {
    // 检查Passport认证状态
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return next();
    }
    
    // 检查传统session认证（向后兼容）
    if (req.session && req.session.userId) {
      return next();
    }
    
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Role-based access control middleware
  const authorize = (roles: string[]) => (req: Request, res: Response, next: Function) => {
    let userRole: string | undefined;
    
    // 优先检查Passport用户角色
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      userRole = (req.user as any).role;
    } else if (req.session && req.session.userRole) {
      // 检查传统session用户角色（向后兼容）
      userRole = req.session.userRole;
    }
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

  // Helper function to get current user ID
  const getCurrentUserId = (req: Request): number | undefined => {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return (req.user as any).id;
    }
    return req.session?.userId;
  };

  // Auth routes are now handled in ssoAuth.ts

  // Employee routes
  app.get("/api/employees", authenticate, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      return res.status(200).json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/employees/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const employee = await storage.getEmployee(id);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      return res.status(200).json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/employees", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const validatedData = validatePayload(extendedEmployeeSchema, req.body);
      const employee = await storage.createEmployee(validatedData);
      
      // Create audit log
      await storage.createAuditLog("employee", employee.id, "create", getCurrentUserId(req)!, employee);
      
      return res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating employee:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/employees/:id", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validatePayload(extendedEmployeeSchema.partial(), req.body);
      
      const updatedEmployee = await storage.updateEmployee(id, validatedData);
      
      if (!updatedEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Create audit log
      await storage.createAuditLog("employee", id, "update", getCurrentUserId(req)!, {
        previous: await storage.getEmployee(id),
        updated: validatedData
      });
      
      return res.status(200).json(updatedEmployee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating employee:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/employees/:id", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEmployee(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Create audit log
      await storage.createAuditLog("employee", id, "delete", getCurrentUserId(req)!, { id });
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting employee:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Salary structure routes
  app.get("/api/salary-structures", authenticate, async (req, res) => {
    try {
      const structures = await storage.getSalaryStructures();
      return res.status(200).json(structures);
    } catch (error) {
      console.error("Error fetching salary structures:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/salary-structures/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const structure = await storage.getSalaryStructure(id);
      
      if (!structure) {
        return res.status(404).json({ message: "Salary structure not found" });
      }
      
      return res.status(200).json(structure);
    } catch (error) {
      console.error("Error fetching salary structure:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/salary-structures", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const validatedData = validatePayload(insertSalaryStructureSchema, req.body);
      const structure = await storage.createSalaryStructure(validatedData);
      
      // Create audit log
      await storage.createAuditLog("salary_structure", structure.id, "create", getCurrentUserId(req)!, structure);
      
      return res.status(201).json(structure);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating salary structure:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/salary-structures/:id", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validatePayload(insertSalaryStructureSchema.partial(), req.body);
      
      const updatedStructure = await storage.updateSalaryStructure(id, validatedData);
      
      if (!updatedStructure) {
        return res.status(404).json({ message: "Salary structure not found" });
      }
      
      // Create audit log
      await storage.createAuditLog("salary_structure", id, "update", getCurrentUserId(req)!, {
        previous: await storage.getSalaryStructure(id),
        updated: validatedData
      });
      
      return res.status(200).json(updatedStructure);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating salary structure:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Salary component routes
  app.get("/api/salary-components", authenticate, async (req, res) => {
    try {
      const structureId = req.query.structureId ? parseInt(req.query.structureId as string) : undefined;
      const components = await storage.getSalaryComponents(structureId);
      return res.status(200).json(components);
    } catch (error) {
      console.error("Error fetching salary components:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/salary-components", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const validatedData = validatePayload(extendedSalaryComponentSchema, req.body);
      
      // Validate formula if provided
      if (validatedData.formula) {
        try {
          // Simple validation of formula syntax
          evaluate(validatedData.formula, { baseSalary: 1000, performanceScore: 80, grossSalary: 1000 });
        } catch (err) {
          return res.status(400).json({ message: "Invalid formula", error: err.message });
        }
      }
      
      const component = await storage.createSalaryComponent(validatedData);
      
      // Create audit log
      await storage.createAuditLog("salary_component", component.id, "create", getCurrentUserId(req)!, component);
      
      return res.status(201).json(component);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating salary component:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/salary-components/:id", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validatePayload(extendedSalaryComponentSchema.partial(), req.body);
      
      // Validate formula if provided
      if (validatedData.formula) {
        try {
          // Simple validation of formula syntax
          evaluate(validatedData.formula, { baseSalary: 1000, performanceScore: 80, grossSalary: 1000 });
        } catch (err) {
          return res.status(400).json({ message: "Invalid formula", error: err.message });
        }
      }
      
      const updatedComponent = await storage.updateSalaryComponent(id, validatedData);
      
      if (!updatedComponent) {
        return res.status(404).json({ message: "Salary component not found" });
      }
      
      // Create audit log
      await storage.createAuditLog("salary_component", id, "update", getCurrentUserId(req)!, {
        previous: await storage.getSalaryComponent(id),
        updated: validatedData
      });
      
      return res.status(200).json(updatedComponent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating salary component:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Employee salary structure assignment routes
  app.get("/api/employee-salary-structures", authenticate, async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const mappings = await storage.getEmployeeSalaryStructures(employeeId);
      return res.status(200).json(mappings);
    } catch (error) {
      console.error("Error fetching employee salary structures:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/employee-salary-structures", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const validatedData = validatePayload(insertEmployeeSalaryStructureSchema, req.body);
      const mapping = await storage.assignSalaryStructure(validatedData);
      
      // Create audit log
      await storage.createAuditLog("employee_salary_structure", mapping.id, "create", getCurrentUserId(req)!, mapping);
      
      return res.status(201).json(mapping);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error assigning salary structure:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Payroll period routes
  app.get("/api/payroll-periods", authenticate, async (req, res) => {
    try {
      const periods = await storage.getPayrollPeriods();
      return res.status(200).json(periods);
    } catch (error) {
      console.error("Error fetching payroll periods:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/payroll-periods", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const validatedData = validatePayload(insertPayrollPeriodSchema, req.body);
      const period = await storage.createPayrollPeriod(validatedData);
      
      // Create audit log
      await storage.createAuditLog("payroll_period", period.id, "create", getCurrentUserId(req)!, period);
      
      return res.status(201).json(period);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating payroll period:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/payroll-periods/:id", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validatePayload(insertPayrollPeriodSchema.partial(), req.body);
      
      const updatedPeriod = await storage.updatePayrollPeriod(id, validatedData);
      
      if (!updatedPeriod) {
        return res.status(404).json({ message: "Payroll period not found" });
      }
      
      // Create audit log
      await storage.createAuditLog("payroll_period", id, "update", getCurrentUserId(req)!, {
        previous: await storage.getPayrollPeriod(id),
        updated: validatedData
      });
      
      return res.status(200).json(updatedPeriod);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating payroll period:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Payroll processing route
  app.post("/api/payroll-process/:periodId", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const periodId = parseInt(req.params.periodId);
      const period = await storage.getPayrollPeriod(periodId);
      
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }
      
      // Get all employees
      const employees = await storage.getEmployees();
      
      // Get all tax rates
      const taxRates = await storage.getTaxRates();
      
      // Process payroll for each employee
      const payrollEntries = [];
      
      for (const employee of employees) {
        // Get employee's salary structure
        const structureMappings = await storage.getEmployeeSalaryStructures(employee.id);
        
        if (structureMappings.length === 0) {
          console.log(`Employee ${employee.id} has no salary structure assigned. Skipping.`);
          continue;
        }
        
        // Use the most recent salary structure
        const activeStructureMapping = structureMappings.sort((a, b) => 
          new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
        )[0];
        
        const salaryStructure = await storage.getSalaryStructure(activeStructureMapping.structureId);
        
        if (!salaryStructure) {
          console.log(`Salary structure ${activeStructureMapping.structureId} not found. Skipping employee ${employee.id}.`);
          continue;
        }
        
        // Get all components for this structure
        const components = await storage.getSalaryComponents(salaryStructure.id);
        
        // Get any component overrides for this employee
        const overrides = await storage.getEmployeeComponentOverrides(employee.id);
        
        // Calculate gross salary
        let grossAmount = 0;
        let deductions = 0;
        const calculationDetails: Record<string, any> = {
          components: [],
          deductions: [],
          grossAmount: 0,
          netAmount: 0,
          totalDeductions: 0
        };
        
        // First pass: calculate fixed amounts and store variable components
        const variableComponents = [];
        
        for (const component of components) {
          // Check if there's an override for this component
          const override = overrides.find(o => o.componentId === component.id);
          
          // Use override values if available
          const amount = override?.amount ?? component.amount;
          const formula = override?.formula ?? component.formula;
          
          if (component.type === "fixed" && amount !== null) {
            grossAmount += amount;
            calculationDetails.components.push({
              name: component.name,
              type: component.type,
              amount,
              taxable: component.taxable
            });
          } else if ((component.type === "variable" || component.type === "deduction") && formula) {
            variableComponents.push({
              ...component,
              formula: override?.formula ?? formula
            });
          }
        }
        
        // Prepare scope for formula evaluation
        const scope: Record<string, any> = {
          baseSalary: calculationDetails.components.find(c => c.name === "Base Salary")?.amount || 0,
          grossSalary: grossAmount,
          performanceScore: 80 // This would come from performance data in a real app
        };
        
        // Second pass: calculate variable components using the scope
        for (const component of variableComponents) {
          try {
            const calculatedAmount = evaluate(component.formula, scope);
            
            if (component.type === "variable") {
              grossAmount += calculatedAmount;
              calculationDetails.components.push({
                name: component.name,
                type: component.type,
                calculatedAmount,
                formula: component.formula,
                taxable: component.taxable
              });
            } else if (component.type === "deduction") {
              deductions += calculatedAmount;
              calculationDetails.deductions.push({
                name: component.name,
                calculatedAmount,
                formula: component.formula
              });
            }
            
            // Update scope for next calculations
            scope.grossSalary = grossAmount;
            scope[component.name.toLowerCase().replace(/\s+/g, '_')] = calculatedAmount;
          } catch (err) {
            console.error(`Error calculating formula for component ${component.name}:`, err);
          }
        }
        
        // Calculate net amount
        const netAmount = grossAmount - deductions;
        
        // Update calculation details
        calculationDetails.grossAmount = grossAmount;
        calculationDetails.totalDeductions = deductions;
        calculationDetails.netAmount = netAmount;
        
        // Create payroll entry
        const payrollEntry = await storage.createPayrollEntry({
          periodId,
          employeeId: employee.id,
          grossAmount,
          netAmount,
          deductions,
          calculationDetails,
          status: "pending"
        });
        
        payrollEntries.push(payrollEntry);
      }
      
      // Update period status
      await storage.updatePayrollPeriod(periodId, { status: "processing", runDate: new Date() });
      
      // Create audit log
      await storage.createAuditLog("payroll_process", periodId, "process", getCurrentUserId(req)!, {
        periodId,
        entries: payrollEntries.length
      });
      
      return res.status(200).json({
        periodId,
        processedEntries: payrollEntries.length,
        entries: payrollEntries
      });
    } catch (error) {
      console.error("Error processing payroll:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get payroll entries for a period
  app.get("/api/payroll-entries", authenticate, async (req, res) => {
    try {
      const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : undefined;
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      
      const entries = await storage.getPayrollEntries(periodId, employeeId);
      
      // If employee is requesting their own payslips, add employee details
      const currentUserId = getCurrentUserId(req);
      const currentUserRole = req.isAuthenticated?.() && req.user ? 
        (req.user as any).role : req.session?.userRole;
      
      if (currentUserRole === "employee" && !employeeId && currentUserId) {
        // Get employee ID from user
        const user = await storage.getUser(currentUserId);
        if (user?.employeeId) {
          return res.status(200).json(
            entries.filter(entry => entry.employeeId === user.employeeId)
          );
        }
      }
      
      return res.status(200).json(entries);
    } catch (error) {
      console.error("Error fetching payroll entries:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get an individual payroll entry (for payslip)
  app.get("/api/payroll-entries/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.getPayrollEntry(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }
      
      // If employee is requesting, check if it's their own payslip
      const currentUserId = getCurrentUserId(req);
      const currentUserRole = req.isAuthenticated?.() && req.user ? 
        (req.user as any).role : req.session?.userRole;
      
      if (currentUserRole === "employee" && currentUserId) {
        const user = await storage.getUser(currentUserId);
        if (user?.employeeId !== entry.employeeId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Get employee details
      const employee = await storage.getEmployee(entry.employeeId);
      // Get period details
      const period = await storage.getPayrollPeriod(entry.periodId);
      
      return res.status(200).json({
        ...entry,
        employee,
        period
      });
    } catch (error) {
      console.error("Error fetching payroll entry:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update a payroll entry (for manual adjustments)
  app.put("/api/payroll-entries/:id", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validatePayload(insertPayrollEntrySchema.partial(), req.body);
      
      const updatedEntry = await storage.updatePayrollEntry(id, validatedData);
      
      if (!updatedEntry) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }
      
      // Create audit log
      await storage.createAuditLog("payroll_entry", id, "update", getCurrentUserId(req)!, {
        previous: await storage.getPayrollEntry(id),
        updated: validatedData
      });
      
      return res.status(200).json(updatedEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating payroll entry:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Benefit routes
  app.get("/api/benefits", authenticate, async (req, res) => {
    try {
      const benefits = await storage.getBenefits();
      return res.status(200).json(benefits);
    } catch (error) {
      console.error("Error fetching benefits:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/benefits", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const validatedData = validatePayload(insertBenefitSchema, req.body);
      const benefit = await storage.createBenefit(validatedData);
      
      // Create audit log
      await storage.createAuditLog("benefit", benefit.id, "create", getCurrentUserId(req)!, benefit);
      
      return res.status(201).json(benefit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating benefit:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Employee benefits routes
  app.get("/api/employee-benefits", authenticate, async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      
      // If employee is requesting their own benefits
      const currentUserId = getCurrentUserId(req);
      const currentUserRole = req.isAuthenticated?.() && req.user ? 
        (req.user as any).role : req.session?.userRole;
      
      if (currentUserRole === "employee" && !employeeId && currentUserId) {
        const user = await storage.getUser(currentUserId);
        if (user?.employeeId) {
          const benefits = await storage.getEmployeeBenefits(user.employeeId);
          return res.status(200).json(benefits);
        }
      }
      
      const benefits = await storage.getEmployeeBenefits(employeeId);
      return res.status(200).json(benefits);
    } catch (error) {
      console.error("Error fetching employee benefits:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/employee-benefits", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const validatedData = validatePayload(insertEmployeeBenefitSchema, req.body);
      const benefit = await storage.enrollEmployeeBenefit(validatedData);
      
      // Create audit log
      await storage.createAuditLog("employee_benefit", benefit.id, "create", getCurrentUserId(req)!, benefit);
      
      return res.status(201).json(benefit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error enrolling employee benefit:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tax rate routes
  app.get("/api/tax-rates", authenticate, async (req, res) => {
    try {
      const taxRates = await storage.getTaxRates();
      return res.status(200).json(taxRates);
    } catch (error) {
      console.error("Error fetching tax rates:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tax-rates", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const validatedData = validatePayload(insertTaxRateSchema, req.body);
      const taxRate = await storage.createTaxRate(validatedData);
      
      // Create audit log
      await storage.createAuditLog("tax_rate", taxRate.id, "create", getCurrentUserId(req)!, taxRate);
      
      return res.status(201).json(taxRate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating tax rate:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard stats route
  app.get("/api/dashboard/stats", authenticate, async (req, res) => {
    try {
      // Get total employees
      const employees = await storage.getEmployees();
      const totalEmployees = employees.length;
      
      // Get payroll periods
      const periods = await storage.getPayrollPeriods();
      
      // Get latest payroll period
      const latestPeriod = periods.sort((a, b) => 
        new Date(b.payDate).getTime() - new Date(a.payDate).getTime()
      )[0];
      
      // Get entries for the latest period
      const entries = latestPeriod ? await storage.getPayrollEntries(latestPeriod.id) : [];
      
      // Calculate total monthly payroll
      const totalMonthlyPayroll = entries.reduce((sum, entry) => sum + entry.grossAmount, 0);
      
      // Get next payroll date
      const nextPayroll = periods.filter(p => new Date(p.payDate) > new Date())
        .sort((a, b) => new Date(a.payDate).getTime() - new Date(b.payDate).getTime())[0];
      
      return res.status(200).json({
        totalEmployees,
        payrollStatus: latestPeriod?.status || "N/A",
        nextPayrollDate: nextPayroll?.payDate || null,
        totalMonthlyPayroll
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Export and Bank Transfer routes
  app.get("/api/payroll/export/:periodId", authenticate, authorize(["admin", "payroll_manager"]), async (req, res) => {
    try {
      const periodId = parseInt(req.params.periodId);
      const period = await storage.getPayrollPeriod(periodId);
      
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }
      
      const entries = await storage.getPayrollEntries(periodId);
      
      const exportData = await Promise.all(entries.map(async entry => {
        const employee = await storage.getEmployee(entry.employeeId);
        return {
          employeeId: employee!.id,
          employeeName: `${employee!.firstName} ${employee!.lastName}`,
          bankName: employee!.bankName,
          accountNumber: employee!.bankAccountNumber,
          amount: entry.netAmount,
          reference: `Payroll-${period.name}-${employee!.id}`
        };
      }));
      
      return res.status(200).json({
        period,
        data: exportData
      });
    } catch (error) {
      console.error("Error exporting payroll data:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
