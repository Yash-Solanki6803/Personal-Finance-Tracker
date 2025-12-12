# Investment Management System - Implementation Plan

## Overview
This document outlines all changes needed to implement manual investment management, proper transaction-investment relationships, budget calculation fixes, and additional enhancements.

---

## FAQ: Design Decisions

### Why do we need both InvestmentTransaction model AND investmentPlanId in Transaction?

**Short Answer:** They serve complementary purposes:

**Transaction Model (`investmentPlanId` field):**
- Records the actual financial transaction (money leaving bank account)
- Generic model that works for all transaction types (income, expense, investment, transfer)
- Shows up in transaction lists and affects bank balance calculations
- The `investmentPlanId` field links it to the investment plan

**InvestmentTransaction Model:**
- Specialized tracking model for investment-specific metadata
- Prevents duplicate monthly investments (unique constraint on plan/year/month)
- Tracks whether investment is monthly or additional
- Provides easy querying: "Show me all investments for this plan" or "Did I invest this month?"
- Links to the Transaction via `transactionId`

**Example Flow:**
When you invest ₹5000 in a plan:
1. Creates `Transaction` (id: T1, amount: 5000, type: investment, investmentPlanId: P1)
2. Creates `InvestmentTransaction` (transactionId: T1, investmentPlanId: P1, month: 11, year: 2025, isMonthlyInvestment: true)

This separation keeps the Transaction model generic while adding investment-specific features like duplicate prevention and historical tracking.

---

## 1. Create Enums File

**File:** `src/lib/enums.ts` (NEW)

```typescript
/**
 * Enums for type-safe constants across the application
 */

export enum TransactionType {
  INCOME = "income",
  EXPENSE = "expense",
  INVESTMENT = "investment",
  TRANSFER = "transfer"
}

export enum InvestmentPlanStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  ARCHIVED = "archived"
}

export enum GoalStatus {
  ON_TRACK = "on_track",
  BEHIND = "behind",
  COMPLETED = "completed"
}

export enum CompoundingFrequency {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUALLY = "annually"
}

export enum RecurringFrequency {
  ONCE = "once",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly"
}

export enum BudgetCategory {
  NEEDS = "needs",
  WANTS = "wants",
  SAVINGS = "savings"
}

// Helper functions to get enum values as arrays
export const getTransactionTypes = () => Object.values(TransactionType);
export const getInvestmentPlanStatuses = () => Object.values(InvestmentPlanStatus);
export const getGoalStatuses = () => Object.values(GoalStatus);
export const getCompoundingFrequencies = () => Object.values(CompoundingFrequency);
export const getRecurringFrequencies = () => Object.values(RecurringFrequency);
export const getBudgetCategories = () => Object.values(BudgetCategory);
```

---

## 2. Database Schema Changes

**File:** `prisma/schema.prisma`

### Add to Transaction model:
```prisma
model Transaction {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @db.ObjectId
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount    Float
  category  String
  type      String   // income, expense, investment, transfer
  date      DateTime
  description String?
  recurringId String?
  investmentPlanId String?  @db.ObjectId  // NEW FIELD
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([date])
  @@index([category])
  @@index([type])
  @@index([recurringId])
  @@index([investmentPlanId])  // NEW INDEX
}
```

### Add new InvestmentTransaction model:
```prisma
model InvestmentTransaction {
  id                  String   @id @default(auto()) @map("_id") @db.ObjectId
  userId              String   @db.ObjectId
  investmentPlanId    String   @db.ObjectId
  transactionId       String   @db.ObjectId
  month               Int      // 1-12
  year                Int
  amount              Float
  isMonthlyInvestment Boolean  @default(true)  // false for additional investments
  createdAt           DateTime @default(now())

  @@unique([investmentPlanId, year, month, isMonthlyInvestment])
  @@index([userId])
  @@index([investmentPlanId])
  @@index([year, month])
}
```

**Action:** Run `npx prisma generate` after updating schema

---

## 3. Update Schemas

**File:** `src/lib/schemas.ts`

Replace all hardcoded string validations with enum checks:

```typescript
import { z } from "zod";
import {
  TransactionType,
  InvestmentPlanStatus,
  GoalStatus,
  CompoundingFrequency,
  RecurringFrequency
} from "./enums";

// Transaction validation schema
export const TransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: "Invalid transaction type" })
  }),
  date: z.union([z.string(), z.date()]),
  description: z.string().optional(),
  recurringId: z.string().optional(),
  investmentPlanId: z.string().optional(),  // NEW FIELD
});

export const InvestmentPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  monthlyContribution: z.number().positive("Monthly contribution must be positive"),
  expectedReturnMin: z.number().min(0).max(100),
  expectedReturnMax: z.number().min(0).max(100),
  compoundingFrequency: z.nativeEnum(CompoundingFrequency, {
    errorMap: () => ({ message: "Invalid compounding frequency" })
  }),
  annualIncreasePercent: z.number().min(0).max(100),
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]).optional(),
  status: z.nativeEnum(InvestmentPlanStatus, {
    errorMap: () => ({ message: "Invalid status" })
  }),
  goalId: z.string().optional(),
}).refine(
  (data) => data.expectedReturnMax >= data.expectedReturnMin,
  {
    message: "Expected return max must be >= expected return min",
    path: ["expectedReturnMax"],
  }
);

export const GoalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(255),
  targetAmount: z.number().positive("Target amount must be positive"),
  targetDate: z.union([z.string(), z.date()]),
  description: z.string().optional(),
  status: z.nativeEnum(GoalStatus, {
    errorMap: () => ({ message: "Invalid status" })
  }).optional(),
});

export const RecurringTransactionSchema = z.object({
  transactionData: z.string().min(1, "Transaction data is required"),
  frequency: z.nativeEnum(RecurringFrequency, {
    errorMap: () => ({ message: "Invalid frequency" })
  }),
  nextDueDate: z.union([z.string(), z.date()]),
  isActive: z.boolean().default(true),
});

export const CategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(255),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: "Invalid type" })
  }),
});

// NEW: Investment Transaction Schema
export const InvestmentTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  skipMonthlyCheck: z.boolean().optional(),
});
```

---

## 4. Create Investment API Endpoints

### 4.1 Manual Investment Endpoint

**File:** `src/app/api/investment-plans/[id]/invest/route.ts` (NEW)

```typescript
import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { InvestmentTransactionSchema } from "@/lib/schemas";
import { TransactionType } from "@/lib/enums";

const prisma = getPrismaClient();

/**
 * POST /api/investment-plans/[id]/invest
 * Manually invest in a plan
 */
export async function POST(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const planId = params?.id as string;

    // Verify plan exists and belongs to user
    const plan = await prisma.investmentPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.userId !== userId) {
      return errorResponse("Investment plan not found or unauthorized", 404);
    }

    if (plan.status !== "active") {
      return errorResponse("Investment plan is not active", 400);
    }

    const body = await validateBody(request);
    const validatedData = InvestmentTransactionSchema.parse(body);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Check if monthly investment already made (unless skipMonthlyCheck is true)
    if (!validatedData.skipMonthlyCheck) {
      const existingMonthlyInvestment = await prisma.investmentTransaction.findFirst({
        where: {
          investmentPlanId: planId,
          month: currentMonth,
          year: currentYear,
          isMonthlyInvestment: true,
        },
      });

      if (existingMonthlyInvestment) {
        return errorResponse(
          "Monthly investment already made for this month. Use skipMonthlyCheck: true to add additional investment.",
          400
        );
      }
    }

    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: validatedData.amount,
        category: "Investments",
        type: TransactionType.INVESTMENT,
        date: now,
        description: `Investment in ${plan.name}`,
        investmentPlanId: planId,
      },
    });

    // Create investment transaction record
    const investmentTransaction = await prisma.investmentTransaction.create({
      data: {
        userId,
        investmentPlanId: planId,
        transactionId: transaction.id,
        month: currentMonth,
        year: currentYear,
        amount: validatedData.amount,
        isMonthlyInvestment: !validatedData.skipMonthlyCheck,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: "investment_made",
        details: JSON.stringify({
          planId,
          planName: plan.name,
          amount: validatedData.amount,
          transactionId: transaction.id,
          isMonthly: !validatedData.skipMonthlyCheck,
        }),
      },
    });

    return successResponse(
      { transaction, investmentTransaction },
      "Investment made successfully",
      201
    );
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "POST /api/investment-plans/:id/invest");
  }
}
```

### 4.2 Get Investment History Endpoint

**File:** `src/app/api/investment-plans/[id]/investments/route.ts` (NEW)

```typescript
import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";

const prisma = getPrismaClient();

/**
 * GET /api/investment-plans/[id]/investments
 * Get all investments for a plan
 */
export async function GET(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const planId = params?.id as string;

    // Verify plan exists and belongs to user
    const plan = await prisma.investmentPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.userId !== userId) {
      return errorResponse("Investment plan not found or unauthorized", 404);
    }

    // Get all investment transactions for this plan
    const investments = await prisma.investmentTransaction.findMany({
      where: { investmentPlanId: planId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Calculate totals
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const monthlyInvestments = investments.filter((inv) => inv.isMonthlyInvestment);
    const additionalInvestments = investments.filter((inv) => !inv.isMonthlyInvestment);

    return successResponse(
      {
        investments,
        summary: {
          totalInvested,
          monthlyInvestmentCount: monthlyInvestments.length,
          additionalInvestmentCount: additionalInvestments.length,
          totalMonthlyInvested: monthlyInvestments.reduce((sum, inv) => sum + inv.amount, 0),
          totalAdditionalInvested: additionalInvestments.reduce((sum, inv) => sum + inv.amount, 0),
        },
      },
      "Investment history retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error, "GET /api/investment-plans/:id/investments");
  }
}
```

### 4.3 Close/Mature Investment Plan Endpoint

**File:** `src/app/api/investment-plans/[id]/close/route.ts` (NEW)

**Purpose:** Closes an investment plan and returns all invested money + returns to the bank account.

```typescript
import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { TransactionType, InvestmentPlanStatus } from "@/lib/enums";

const prisma = getPrismaClient();

/**
 * POST /api/investment-plans/[id]/close
 * Close an investment plan and return principal + returns to bank account
 */
export async function POST(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const planId = params?.id as string;

    // Verify plan exists and belongs to user
    const plan = await prisma.investmentPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.userId !== userId) {
      return errorResponse("Investment plan not found or unauthorized", 404);
    }

    if (plan.status === InvestmentPlanStatus.ARCHIVED) {
      return errorResponse("Investment plan is already closed", 400);
    }

    // Get all investment transactions for this plan
    const investments = await prisma.investmentTransaction.findMany({
      where: { investmentPlanId: planId },
      select: { amount: true, createdAt: true },
    });

    if (investments.length === 0) {
      return errorResponse("No investments found in this plan", 400);
    }

    // Calculate total invested (principal)
    const totalPrincipal = investments.reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate returns based on time elapsed for each investment
    const now = new Date();
    let minReturns = 0;
    let maxReturns = 0;

    for (const inv of investments) {
      const monthsElapsed = Math.max(0, Math.floor(
        (now.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      ));

      if (monthsElapsed > 0) {
        const monthlyRateMin = plan.expectedReturnMin / 100 / 12;
        const monthlyRateMax = plan.expectedReturnMax / 100 / 12;

        const valueMin = inv.amount * Math.pow(1 + monthlyRateMin, monthsElapsed);
        const valueMax = inv.amount * Math.pow(1 + monthlyRateMax, monthsElapsed);

        minReturns += (valueMin - inv.amount);
        maxReturns += (valueMax - inv.amount);
      }
    }

    // Use average of min and max for the return amount
    const estimatedReturns = Math.round(((minReturns + maxReturns) / 2) * 100) / 100;
    const totalAmount = totalPrincipal + estimatedReturns;

    // Create INCOME transaction to credit bank account
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: totalAmount,
        category: "Investment Returns",
        type: TransactionType.INCOME,
        date: now,
        description: `Maturity/Closure of investment plan: ${plan.name}. Principal: ₹${totalPrincipal.toFixed(2)}, Returns: ₹${estimatedReturns.toFixed(2)}`,
        investmentPlanId: planId,
      },
    });

    // Update investment plan status to archived and set endDate
    await prisma.investmentPlan.update({
      where: { id: planId },
      data: {
        status: InvestmentPlanStatus.ARCHIVED,
        endDate: now,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: "investment_plan_closed",
        details: JSON.stringify({
          planId,
          planName: plan.name,
          totalPrincipal,
          estimatedReturns,
          totalAmount,
          transactionId: transaction.id,
          minReturns,
          maxReturns,
        }),
      },
    });

    return successResponse(
      {
        transaction,
        summary: {
          totalPrincipal,
          estimatedReturns,
          totalAmount,
          minReturns,
          maxReturns,
        },
      },
      "Investment plan closed successfully and funds credited to your account"
    );
  } catch (error) {
    return handleApiError(error, "POST /api/investment-plans/:id/close");
  }
}
```

---

## 5. Update Financial Calculations

**File:** `src/lib/financial-calculations.ts`

Update `getNetWorth()` to use actual investment transactions instead of theoretical calculations:

```typescript
/**
 * Calculate user's net worth
 * Sums bank balance and actual investment value from transactions
 */
export async function getNetWorth(userId: string): Promise<{ minNetWorth: number; maxNetWorth: number }> {
  const bankBalance = await getBankBalance(userId);

  // Get all investment transactions
  const investmentTransactions = await prisma.investmentTransaction.findMany({
    where: { userId },
    select: { amount: true },
  });

  // Sum up actual investments made
  const totalInvested = investmentTransactions.reduce((sum, inv) => sum + inv.amount, 0);

  // Get active investment plans to calculate projected returns
  const plans = await prisma.investmentPlan.findMany({
    where: { userId, status: "active" },
    select: {
      id: true,
      expectedReturnMin: true,
      expectedReturnMax: true,
      startDate: true,
    },
  });

  let minValue = 0;
  let maxValue = 0;

  // For each plan, get its investments and calculate returns
  for (const plan of plans) {
    const planInvestments = await prisma.investmentTransaction.findMany({
      where: { investmentPlanId: plan.id },
      select: { amount: true, createdAt: true },
    });

    const now = new Date();

    for (const inv of planInvestments) {
      // Calculate elapsed months for this specific investment
      const monthsElapsed = Math.max(0, Math.floor(
        (now.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      ));

      if (monthsElapsed === 0) {
        minValue += inv.amount;
        maxValue += inv.amount;
        continue;
      }

      // Apply compound interest
      const monthlyRateMin = plan.expectedReturnMin / 100 / 12;
      const monthlyRateMax = plan.expectedReturnMax / 100 / 12;

      const valueMin = inv.amount * Math.pow(1 + monthlyRateMin, monthsElapsed);
      const valueMax = inv.amount * Math.pow(1 + monthlyRateMax, monthsElapsed);

      minValue += valueMin;
      maxValue += valueMax;
    }
  }

  return {
    minNetWorth: Math.round((bankBalance + minValue) * 100) / 100,
    maxNetWorth: Math.round((bankBalance + maxValue) * 100) / 100,
  };
}

/**
 * Calculate goal progress based on actual investment transactions
 */
export async function getGoalProgress(userId: string, goalId: string): Promise<number> {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) return 0;

  // Get investment plans linked to this goal
  const investmentPlans = await prisma.investmentPlan.findMany({
    where: { userId, goalId, status: "active" },
    select: { id: true },
  });

  // Get actual investments made
  let totalInvested = 0;

  for (const plan of investmentPlans) {
    const investments = await prisma.investmentTransaction.findMany({
      where: { investmentPlanId: plan.id },
      select: { amount: true },
    });

    totalInvested += investments.reduce((sum, inv) => sum + inv.amount, 0);
  }

  return Math.min(100, Math.round((totalInvested / goal.targetAmount) * 100 * 100) / 100);
}
```

---

## 6. Update Budget Calculations

**File:** `src/app/api/analytics/monthly-summary/route.ts`

Update to include investment transactions in budget allocation:

```typescript
// After getting transactions, separate by type
const income = transactions.filter((t) => t.type === "income");
const expense = transactions.filter((t) => t.type === "expense");
const investment = transactions.filter((t) => t.type === "investment");  // NEW

// Calculate totals
const totalIncome = sumAmounts(income);
const totalExpense = sumAmounts(expense);
const totalInvestment = sumAmounts(investment);  // NEW
const netSavings = totalIncome - totalExpense - totalInvestment;  // UPDATED

// In budget allocation calculation, include investments as savings
expense.forEach((transaction) => {
  const classification = getCategoryClassification(transaction.category);
  switch (classification) {
    case "needs":
      needsActual += transaction.amount;
      break;
    case "wants":
      wantsActual += transaction.amount;
      break;
    case "savings":
      savingsActual += transaction.amount;
      break;
  }
});

// Add investments to savings category
savingsActual += totalInvestment;  // NEW
```

---

## 7. Update Category Classification

**File:** `src/lib/category-classification.ts`

Ensure "Investments" category is classified as savings (already correct).

---

## 8. Update Clean-DB Script

**File:** `scripts/clean-db.ts`

Add InvestmentTransaction cleanup:

```typescript
await prisma.investmentTransaction.deleteMany({});
console.log("✓ Deleted all investment transactions");

// Add this BEFORE deleting transactions since InvestmentTransaction
// references Transaction
await prisma.transaction.deleteMany({});
console.log("✓ Deleted all transactions");
```

---

## 9. Update All Type References

Replace hardcoded string comparisons with enum values in these files:

### 9.1 `src/hooks/useFinancialCalculations.ts`
```typescript
import { TransactionType } from "@/lib/enums";

// Replace:
// t.type === "income"
// With:
t.type === TransactionType.INCOME

// Replace:
// t.type === "expense"
// With:
t.type === TransactionType.EXPENSE
```

### 9.2 `src/lib/financial-calculations.ts`
```typescript
import { TransactionType } from "@/lib/enums";

if (tx.type === TransactionType.INCOME) balance += tx.amount;
if (tx.type === TransactionType.EXPENSE || tx.type === TransactionType.INVESTMENT) balance -= tx.amount;
```

### 9.3 `src/components/TransactionsList.tsx`
```typescript
import { TransactionType } from "@/lib/enums";

interface Transaction {
  type: TransactionType;  // Update type
  // ...
}

// Update all comparisons
t.type === TransactionType.INCOME
```

### 9.4 `src/components/RecentTransactions.tsx`
```typescript
import { TransactionType } from "@/lib/enums";

transaction.type === TransactionType.INCOME
```

### 9.5 `src/app/(dashboard)/cash-flow/page.tsx`

**CRITICAL FIX NEEDED**: The cash flow page currently calculates `totalInvestedToDate` theoretically based on plan start dates, but should use actual investment transactions.

```typescript
import { TransactionType } from "@/lib/enums";

// Update hardcoded type checks:
t.type === TransactionType.EXPENSE
transactionData.type === TransactionType.INCOME

// FIX totalInvestedToDate calculation:
// Replace the existing useMemo calculation with:
const [totalInvestedToDate, setTotalInvestedToDate] = useState<number>(0);

useEffect(() => {
  const fetchActualInvestments = async () => {
    try {
      // Get all investment transactions for all active plans
      const plansRes = await fetch("/api/investment-plans?status=active");
      if (!plansRes.ok) return;

      const plansData = await plansRes.json();
      if (!plansData.success || !Array.isArray(plansData.data)) return;

      let totalInvested = 0;

      // For each plan, get actual investments
      for (const plan of plansData.data) {
        const invRes = await fetch(`/api/investment-plans/${plan.id}/investments`);
        if (invRes.ok) {
          const invData = await invRes.json();
          if (invData.success && invData.data.summary) {
            totalInvested += invData.data.summary.totalInvested;
          }
        }
      }

      setTotalInvestedToDate(totalInvested);
    } catch (err) {
      console.error("Failed to fetch actual investments", err);
    }
  };

  fetchActualInvestments();
}, []);

// This ensures cash flow projections are based on ACTUAL investments made,
// not theoretical assumptions
```

**Why this matters**: With manual investments, you might skip months or invest different amounts. The projection should start from the real invested amount, not an assumption.

### 9.6 `src/app/(dashboard)/recurring-transactions/page.tsx`
```typescript
import { TransactionType } from "@/lib/enums";

t.type === TransactionType.INCOME
```

### 9.7 `src/app/api/dashboard/net-worth-timeline/route.ts`

**CRITICAL FIXES NEEDED**:
1. Use actual InvestmentTransaction records instead of theoretical calculations
2. Add future predictions (12-24 months forward)
3. Update type references to use enums

```typescript
import { TransactionType } from "@/lib/enums";

// 1. Fix type references:
if (tx.type === TransactionType.INCOME) cashTimeline[key] += tx.amount;
if (tx.type === TransactionType.EXPENSE || tx.type === TransactionType.INVESTMENT) cashTimeline[key] -= tx.amount;

// 2. Replace theoretical investment calculation with ACTUAL investments:
// Remove the old SIP formula loop and replace with:

// Get actual investment transactions
const investmentTransactions = await prisma.investmentTransaction.findMany({
  where: { userId },
  select: { amount: true, createdAt: true, investmentPlanId: true },
});

// Get active investment plans for return rates
const investmentPlans = await prisma.investmentPlan.findMany({
  where: { userId, status: "active" },
  select: {
    id: true,
    expectedReturnMin: true,
    expectedReturnMax: true,
  },
});

// Calculate investment value for each month based on ACTUAL investments
const investmentTimeline: Record<string, { min: number; max: number }> = {};
months.forEach(m => investmentTimeline[m] = { min: 0, max: 0 });

// For each investment transaction, calculate its value in each month
for (const invTx of investmentTransactions) {
  const plan = investmentPlans.find(p => p.id === invTx.investmentPlanId);
  if (!plan) continue;

  const invDate = new Date(invTx.createdAt);
  const invMonth = `${invDate.getFullYear()}-${String(invDate.getMonth()+1).padStart(2,"0")}`;

  const monthlyRateMin = plan.expectedReturnMin / 100 / 12;
  const monthlyRateMax = plan.expectedReturnMax / 100 / 12;

  months.forEach((m) => {
    const [year, month] = m.split("-").map(Number);
    const monthDate = new Date(year, month-1, 1);
    const invDateStart = new Date(invDate.getFullYear(), invDate.getMonth(), 1);

    if (monthDate < invDateStart) return;

    // Calculate elapsed months from investment date
    const elapsedMonths = Math.max(0,
      (year - invDate.getFullYear()) * 12 + (month - (invDate.getMonth()+1))
    );

    // Apply compound interest to this specific investment
    const valueMin = invTx.amount * Math.pow(1 + monthlyRateMin, elapsedMonths);
    const valueMax = invTx.amount * Math.pow(1 + monthlyRateMax, elapsedMonths);

    investmentTimeline[m].min += valueMin;
    investmentTimeline[m].max += valueMax;
  });
}

// 3. Add FUTURE PREDICTIONS (12 months forward):
const futureMonths = 12;
const lastHistoricalMonth = months[months.length - 1];
const [lastYear, lastMonth] = lastHistoricalMonth.split("-").map(Number);

// Get current salary for projections
const currentSalary = await prisma.salary.findFirst({
  where: { userId },
  orderBy: { lastUpdatedDate: "desc" },
});
const monthlySalary = currentSalary?.amount || 0;

// Calculate average monthly expenses (last 3 months)
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
const recentExpenses = await prisma.transaction.findMany({
  where: {
    userId,
    type: TransactionType.EXPENSE,
    date: { gte: threeMonthsAgo },
  },
  select: { amount: true },
});
const avgMonthlyExpense = recentExpenses.length > 0
  ? recentExpenses.reduce((sum, t) => sum + t.amount, 0) / 3
  : 0;

// Calculate total monthly investments from active plans
const totalMonthlyInvestments = investmentPlans.reduce(
  (sum, plan) => sum + (plan.monthlyContribution || 0),
  0
);

// Project future months
let lastCash = cashCumulative[lastHistoricalMonth];
let lastInvMin = investmentTimeline[lastHistoricalMonth].min;
let lastInvMax = investmentTimeline[lastHistoricalMonth].max;

for (let i = 1; i <= futureMonths; i++) {
  const futureDate = new Date(lastYear, lastMonth - 1 + i, 1);
  const futureMonth = `${futureDate.getFullYear()}-${String(futureDate.getMonth()+1).padStart(2,"0")}`;

  // Project cash flow
  const monthlyNetCash = monthlySalary - avgMonthlyExpense - totalMonthlyInvestments;
  lastCash += monthlyNetCash;

  // Project investment growth (assume monthly investments continue)
  const avgMonthlyRateMin = investmentPlans.reduce((sum, p) => sum + p.expectedReturnMin, 0) / Math.max(1, investmentPlans.length) / 100 / 12;
  const avgMonthlyRateMax = investmentPlans.reduce((sum, p) => sum + p.expectedReturnMax, 0) / Math.max(1, investmentPlans.length) / 100 / 12;

  lastInvMin = (lastInvMin + totalMonthlyInvestments) * (1 + avgMonthlyRateMin);
  lastInvMax = (lastInvMax + totalMonthlyInvestments) * (1 + avgMonthlyRateMax);

  months.push(futureMonth);
  cashCumulative[futureMonth] = lastCash;
  investmentTimeline[futureMonth] = { min: lastInvMin, max: lastInvMax };
}

// Build final timeline (now includes future predictions)
const timeline = months.map(m => ({
  month: m,
  cash: cashCumulative[m],
  investmentsMin: investmentTimeline[m].min,
  investmentsMax: investmentTimeline[m].max,
  netWorthMin: cashCumulative[m] + investmentTimeline[m].min,
  netWorthMax: cashCumulative[m] + investmentTimeline[m].max,
  isFuture: m > lastHistoricalMonth,  // NEW: Flag future predictions
}));
```

**Why this matters**:
- Historical data uses ACTUAL investment transactions
- Future predictions show where you're heading
- More accurate and useful for financial planning

### 9.8 `src/app/api/analytics/monthly-summary/route.ts`
```typescript
import { TransactionType } from "@/lib/enums";

const income = transactions.filter((t) => t.type === TransactionType.INCOME);
const expense = transactions.filter((t) => t.type === TransactionType.EXPENSE);
const investment = transactions.filter((t) => t.type === TransactionType.INVESTMENT);
```

---

## 10. Add Transaction Totals to Transactions List

**File:** `src/components/TransactionsList.tsx`

Add totals calculation and display:

```typescript
// After fetching transactions, calculate totals
const totals = transactions.reduce(
  (acc, t) => {
    switch (t.type) {
      case TransactionType.INCOME:
        acc.income += t.amount;
        break;
      case TransactionType.EXPENSE:
        acc.expense += t.amount;
        break;
      case TransactionType.INVESTMENT:
        acc.investment += t.amount;
        break;
      case TransactionType.TRANSFER:
        acc.transfer += t.amount;
        break;
    }
    acc.total += t.amount;
    return acc;
  },
  { income: 0, expense: 0, investment: 0, transfer: 0, total: 0 }
);

// Add totals display above the transactions list (after filters, before transactions):
<div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
  <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
    <p className="text-xs font-medium text-success/80 mb-1">Income</p>
    <p className="text-2xl font-bold text-success">{formatCurrency(totals.income)}</p>
  </div>
  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
    <p className="text-xs font-medium text-destructive/80 mb-1">Expenses</p>
    <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.expense)}</p>
  </div>
  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
    <p className="text-xs font-medium text-primary/80 mb-1">Investments</p>
    <p className="text-2xl font-bold text-primary">{formatCurrency(totals.investment)}</p>
  </div>
  <div className="p-4 bg-secondary border border-border rounded-lg">
    <p className="text-xs font-medium text-muted-foreground mb-1">Net</p>
    <p className="text-2xl font-bold text-foreground">
      {formatCurrency(totals.income - totals.expense - totals.investment)}
    </p>
  </div>
</div>
```

---

## 11. Fix Goal Calculations Compounding

**File:** `src/lib/goal-calculations.ts`

Change default compounding from monthly to annual:

```typescript
export const calculateRequiredSIP = (
  targetAmount: number,
  targetDate: Date,
  expectedReturnPercent: number = 12,
  compoundingFrequency: string = "annually",  // CHANGED FROM "monthly"
  annualIncreasePercent: number = 10
): number => {
  const now = new Date();
  const months = Math.max(
    1,
    Math.ceil(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
  );

  if (months <= 0) {
    return 0;
  }

  // Calculate return rate based on compounding frequency
  let periodicRate: number;
  let periodsPerYear: number;

  switch (compoundingFrequency) {
    case "annually":
      periodicRate = expectedReturnPercent / 100;
      periodsPerYear = 1;
      break;
    case "quarterly":
      periodicRate = expectedReturnPercent / 100 / 4;
      periodsPerYear = 4;
      break;
    case "monthly":
    default:
      periodicRate = expectedReturnPercent / 100 / 12;
      periodsPerYear = 12;
      break;
  }

  // For SIP calculations, we still make monthly contributions
  // but the interest compounds at the specified frequency
  const monthlyRate = periodicRate / (12 / periodsPerYear);

  // Calculate the future value factor accounting for annual increases
  let futureValueFactor = 0;
  let annualIncreaseRate = annualIncreasePercent / 100;

  for (let month = 0; month < months; month++) {
    const yearsElapsed = Math.floor(month / 12);
    const growthMultiplier = Math.pow(1 + annualIncreaseRate, yearsElapsed);
    const monthsFromNow = months - month - 1;
    futureValueFactor += growthMultiplier * Math.pow(1 + monthlyRate, monthsFromNow);
  }

  if (futureValueFactor === 0) {
    return roundToDecimal(targetAmount / months);
  }

  const monthlySIP = targetAmount / futureValueFactor;
  return roundToDecimal(monthlySIP);
};
```

**File:** `src/app/(dashboard)/goals/new/page.tsx`

Update the display text:

```typescript
<p className="text-xs text-primary/80 mt-1">
  Assumes 12% annual return with annual compounding
</p>
```

---

## 12. Frontend - Investment Plans Updates

### 12.1 Investment Plans List Page

**File:** `src/app/(dashboard)/investment-plans/page.tsx`

Add "Invest Now" button and monthly investment status:

```typescript
// Add state for investment status
const [investmentStatus, setInvestmentStatus] = useState<Record<string, boolean>>({});

// Check monthly investment status for each plan
useEffect(() => {
  const checkMonthlyInvestments = async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const status: Record<string, boolean> = {};

    for (const plan of plans) {
      try {
        const res = await fetch(`/api/investment-plans/${plan.id}/investments`);
        const data = await res.json();

        if (data.success) {
          const hasMonthlyInvestment = data.data.investments.some(
            (inv: any) =>
              inv.year === currentYear &&
              inv.month === currentMonth &&
              inv.isMonthlyInvestment
          );
          status[plan.id] = hasMonthlyInvestment;
        }
      } catch (err) {
        console.error("Failed to check investment status", err);
      }
    }

    setInvestmentStatus(status);
  };

  if (plans.length > 0) {
    checkMonthlyInvestments();
  }
}, [plans]);

// In the plan card, add invest button, close button, and status indicator:
<div className="flex items-center gap-2">
  {investmentStatus[plan.id] && (
    <span className="px-2 py-1 text-xs bg-success/20 text-success rounded">
      ✓ Invested this month
    </span>
  )}
  {plan.status === "active" && (
    <>
      <button
        onClick={() => handleInvestNow(plan)}
        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
      >
        Invest Now
      </button>
      <button
        onClick={() => handleClosePlan(plan)}
        className="px-4 py-2 bg-warning hover:bg-warning/90 text-warning-foreground rounded-lg text-sm font-medium transition-colors"
      >
        Close & Withdraw
      </button>
    </>
  )}
</div>

// Add handler function:
const handleClosePlan = async (plan: any) => {
  const confirmed = confirm(
    `Are you sure you want to close "${plan.name}" and withdraw all funds? This will credit your bank account with the principal + returns.`
  );

  if (!confirmed) return;

  try {
    const res = await fetch(`/api/investment-plans/${plan.id}/close`, {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to close investment plan");
    }

    // Show success message with details
    alert(
      `Investment plan closed successfully!\n\n` +
      `Principal: ${formatCurrency(data.data.summary.totalPrincipal)}\n` +
      `Returns: ${formatCurrency(data.data.summary.estimatedReturns)}\n` +
      `Total Credited: ${formatCurrency(data.data.summary.totalAmount)}`
    );

    // Refresh the list
    fetchPlans();
  } catch (err) {
    alert(err instanceof Error ? err.message : "Failed to close investment plan");
  }
};
```

### 12.2 Create Investment Modal Component

**File:** `src/components/InvestmentModal.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface InvestmentModalProps {
  plan: {
    id: string;
    name: string;
    monthlyContribution: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvestmentModal({ plan, isOpen, onClose, onSuccess }: InvestmentModalProps) {
  const [amount, setAmount] = useState(plan.monthlyContribution);
  const [isAdditional, setIsAdditional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/investment-plans/${plan.id}/invest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          skipMonthlyCheck: isAdditional,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to invest");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Invest in {plan.name}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Amount <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <button
              type="button"
              onClick={() => setAmount(plan.monthlyContribution)}
              className="text-xs text-primary hover:underline mt-1"
            >
              Use suggested: {formatCurrency(plan.monthlyContribution)}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAdditional"
              checked={isAdditional}
              onChange={(e) => setIsAdditional(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="isAdditional" className="text-sm text-foreground">
              This is an additional investment (not the monthly contribution)
            </label>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? "Processing..." : "Invest"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border text-foreground font-semibold rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 13. Implementation Order

Execute changes in this order to avoid dependency issues:

1. ✅ Create `src/lib/enums.ts`
2. ✅ Update `prisma/schema.prisma` (add investmentPlanId, create InvestmentTransaction)
3. ✅ Run `npx prisma generate`
4. ✅ Update `src/lib/schemas.ts` (use enums)
5. ✅ Update `scripts/clean-db.ts` (add InvestmentTransaction cleanup)
6. ✅ Update `src/lib/goal-calculations.ts` (annual compounding default)
7. ✅ Create `src/app/api/investment-plans/[id]/invest/route.ts`
8. ✅ Create `src/app/api/investment-plans/[id]/investments/route.ts`
9. ✅ Create `src/app/api/investment-plans/[id]/close/route.ts` (NEW - Investment maturity)
10. ✅ Update `src/lib/financial-calculations.ts` (use actual transactions)
11. ✅ Update `src/app/api/analytics/monthly-summary/route.ts` (include investments)
12. ✅ Update all files with type references (use enums)
13. ✅ Update `src/components/TransactionsList.tsx` (add totals)
14. ✅ Create `src/components/InvestmentModal.tsx`
15. ✅ Update `src/app/(dashboard)/investment-plans/page.tsx` (add invest & close buttons)
16. ✅ Update `src/app/(dashboard)/goals/new/page.tsx` (update text)
17. ✅ Test all functionality end-to-end

---

## 14. Testing Checklist

- [ ] Clean database with updated script
- [ ] Create investment plan
- [ ] Make monthly investment
- [ ] Verify duplicate prevention
- [ ] Make additional investment with skipMonthlyCheck
- [ ] Close investment plan and verify withdrawal
- [ ] Verify transactions list shows correct totals
- [ ] Verify budget calculations include investments
- [ ] Verify net worth calculations use actual transactions
- [ ] Verify bank balance increases after closing investment
- [ ] Create goal and verify annual compounding is used
- [ ] Test all enum validations
- [ ] Test investment history endpoint
- [ ] Verify audit logs are created for all operations

---

## Summary

This implementation adds:
- ✅ Manual investment management with duplicate prevention
- ✅ Proper transaction-investment relationships
- ✅ Investment tracking with monthly vs additional distinction
- ✅ **Investment maturity/withdrawal feature** (close plan and get money back)
- ✅ Budget calculations including investments
- ✅ Net worth based on actual transactions
- ✅ Type-safe enums throughout codebase
- ✅ Transaction totals display with filters
- ✅ Annual compounding default for goals
- ✅ Clean database script updates
- ✅ Complete audit trail

**Total Files to Create:** 5 (enums, 3 API endpoints, investment modal)
**Total Files to Modify:** 20+

**New API Endpoints:**
1. `POST /api/investment-plans/[id]/invest` - Make manual investment
2. `GET /api/investment-plans/[id]/investments` - Get investment history
3. `POST /api/investment-plans/[id]/close` - Close plan and withdraw funds
