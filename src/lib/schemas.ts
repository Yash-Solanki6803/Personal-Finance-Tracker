import { z } from "zod";

// Transaction validation schema
export const TransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  type: z.string().refine(
    (val) => ["income", "expense"].includes(val),
    "Type must be 'income' or 'expense'"
  ),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  recurringId: z.string().optional(),
});

export const TransactionUpdateSchema = TransactionSchema.partial();

export type Transaction = z.infer<typeof TransactionSchema> & { id: string };

// Investment Plan validation schema
export const InvestmentPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  monthlyContribution: z
    .number()
    .positive("Monthly contribution must be positive"),
  expectedReturnMin: z.number().min(0, "Expected return min must be >= 0"),
  expectedReturnMax: z.number().min(0, "Expected return max must be >= 0"),
  compoundingFrequency: z.string().refine(
    (val) => ["monthly", "quarterly", "annually"].includes(val),
    "Compounding frequency must be 'monthly', 'quarterly', or 'annually'"
  ),
  annualIncreasePercent: z.number().min(0, "Annual increase must be >= 0"),
  startDate: z.date(),
  endDate: z.date().optional(),
  status: z.string().refine(
    (val) => ["active", "paused", "archived"].includes(val),
    "Status must be 'active', 'paused', or 'archived'"
  ),
  goalId: z.string().optional(), // Optional: Link to a specific goal
});

export const InvestmentPlanUpdateSchema = InvestmentPlanSchema.partial();

export type InvestmentPlan = z.infer<typeof InvestmentPlanSchema> & {
  id: string;
};

// Budget Rule validation schema
export const BudgetRuleSchema = z
  .object({
    needsPercent: z
      .number()
      .min(0, "Needs must be >= 0")
      .max(100, "Needs must be <= 100"),
    wantsPercent: z
      .number()
      .min(0, "Wants must be >= 0")
      .max(100, "Wants must be <= 100"),
    savingsPercent: z
      .number()
      .min(0, "Savings must be >= 0")
      .max(100, "Savings must be <= 100"),
  })
  .refine(
    (data) => data.needsPercent + data.wantsPercent + data.savingsPercent === 100,
    {
      message: "Needs + Wants + Savings must equal 100%",
      path: ["savingsPercent"],
    }
  );

export const BudgetRuleUpdateSchema = BudgetRuleSchema.partial().refine(
  (data) => {
    if (
      data.needsPercent !== undefined ||
      data.wantsPercent !== undefined ||
      data.savingsPercent !== undefined
    ) {
      const needs = data.needsPercent ?? 0;
      const wants = data.wantsPercent ?? 0;
      const savings = data.savingsPercent ?? 0;
      return needs + wants + savings === 100;
    }
    return true;
  },
  {
    message: "Needs + Wants + Savings must equal 100%",
    path: ["savingsPercent"],
  }
);

export type BudgetRule = z.infer<typeof BudgetRuleSchema> & { id: string };

// Recurring Transaction validation schema
export const RecurringTransactionSchema = z.object({
  transactionData: z.string().min(1, "Transaction data is required"),
  frequency: z.string().refine(
    (val) => ["once", "daily", "weekly", "monthly", "yearly"].includes(val),
    "Frequency must be 'once', 'daily', 'weekly', 'monthly', or 'yearly'"
  ),
  nextDueDate: z.union([z.date(), z.string()]).transform((val) => {
    if (typeof val === "string") return new Date(val);
    return val;
  }),
  isActive: z.boolean().default(true),
});

export const RecurringTransactionUpdateSchema =
  RecurringTransactionSchema.partial();

export type RecurringTransaction = z.infer<typeof RecurringTransactionSchema> & {
  id: string;
};

// Category validation schema
export const CategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(255),
  type: z.string().refine(
    (val) => ["expense", "income", "savings", "investment"].includes(val),
    "Type must be 'expense', 'income', 'savings', or 'investment'"
  ),
});

export const CategoryUpdateSchema = CategorySchema.partial();

export type Category = z.infer<typeof CategorySchema> & { id: string };

// Salary validation schema
export const SalaryInputSchema = z.object({
  amount: z.number().positive("Salary amount must be positive"),
  lastUpdatedDate: z.union([z.date(), z.string()]),
});

export const SalarySchema = z.object({
  amount: z.number().positive("Salary amount must be positive"),
  lastUpdatedDate: z.coerce.date(),
});

export const SalaryUpdateSchema = SalaryInputSchema.partial();

export type Salary = z.infer<typeof SalarySchema> & { id: string };

// Goal validation schema - Input accepts string or Date
export const GoalInputSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(255).optional(),
  targetAmount: z.number().positive("Target amount must be positive").optional(),
  targetDate: z.union([z.date(), z.string()]).optional(),
  description: z.string().optional(),
  status: z.string().refine(
    (val) => ["on_track", "behind", "completed"].includes(val),
    "Status must be 'on_track', 'behind', or 'completed'"
  ).optional(),
});

export const GoalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(255),
  targetAmount: z.number().positive("Target amount must be positive"),
  targetDate: z.coerce.date(),
  description: z.string().optional(),
  status: z.string().refine(
    (val) => ["on_track", "behind", "completed"].includes(val),
    "Status must be 'on_track', 'behind', or 'completed'"
  ).optional(),
});

export const GoalUpdateSchema = GoalInputSchema;

export type Goal = z.infer<typeof GoalSchema> & { id: string };
