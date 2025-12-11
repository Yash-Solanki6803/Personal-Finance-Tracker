import { NextRequest } from "next/server";
import {
  successResponse,
  getPrismaClient,
  handleApiError,
  errorResponse,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { sumAmounts, groupByMonth, groupByCategory } from "@/lib/utils";
import { startOfMonth, endOfMonth } from "date-fns";
import { getCategoryClassification } from "@/lib/category-classification";
import { TransactionType } from "@/lib/enums";

const prisma = getPrismaClient();

/**
 * GET /api/analytics/monthly-summary
 * Get monthly income, expense, and savings summary for a given month
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get("month"); // Format: YYYY-MM

    // Default to current month if not provided
    const date = monthStr ? new Date(monthStr + "-01") : new Date();
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    // Get transactions for the month for this user
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      orderBy: { date: "desc" },
    });

    // Separate income, expense, and investments
    const income = transactions.filter((t) => t.type === TransactionType.INCOME);
    const expense = transactions.filter((t) => t.type === TransactionType.EXPENSE);
    const investments = transactions.filter((t) => t.type === TransactionType.INVESTMENT);

    // Filter out income transactions with savings categories for budget calculations
    const budgetIncome = income.filter((t) => {
      const classification = getCategoryClassification(t.category);
      return classification !== "savings";
    });

    // Calculate totals
    const totalIncome = sumAmounts(income); // Total income including savings transfers
    const budgetTotalIncome = sumAmounts(budgetIncome); // Income for budget calculations (excluding savings)
    const totalExpense = sumAmounts(expense);
    const totalInvestments = sumAmounts(investments);
    const netSavings = totalIncome - totalExpense - totalInvestments;

    // Group expenses by category
    const expenseByCategory = groupByCategory(expense);
    const categoryBreakdown: Record<string, number> = {};

    Object.entries(expenseByCategory).forEach(([category, cats]) => {
      categoryBreakdown[category] = sumAmounts(
        cats.map((t) => ({ amount: t.amount }))
      );
    });

    // Get current budget rule for this user
    const budgetRule = await prisma.budgetRule.findFirst({
      where: { userId },
    });

    // Calculate actual spending by budget category (needs/wants/savings)
    // Include investments in savings
    let needsActual = 0;
    let wantsActual = 0;
    let savingsActual = totalInvestments; // Start with investments

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

    // Calculate budget allocation structure
    const budgetAllocation: Record<
      string,
      { budget: number; actual: number; percentage: number }
    > = {};

    if (budgetRule && budgetTotalIncome > 0) {
      const needsBudget = (budgetRule.needsPercent / 100) * budgetTotalIncome;
      const wantsBudget = (budgetRule.wantsPercent / 100) * budgetTotalIncome;
      const savingsBudget = (budgetRule.savingsPercent / 100) * budgetTotalIncome;

      budgetAllocation.needs = {
        budget: needsBudget,
        actual: needsActual,
        percentage: budgetTotalIncome > 0 ? (needsActual / budgetTotalIncome) * 100 : 0,
      };

      budgetAllocation.wants = {
        budget: wantsBudget,
        actual: wantsActual,
        percentage: budgetTotalIncome > 0 ? (wantsActual / budgetTotalIncome) * 100 : 0,
      };

      budgetAllocation.savings = {
        budget: savingsBudget,
        actual: savingsActual,
        percentage: budgetTotalIncome > 0 ? (savingsActual / budgetTotalIncome) * 100 : 0,
      };
    }

    return successResponse(
      {
        month: monthStart.toISOString().substring(0, 7),
        totalIncome,
        totalExpense,
        totalInvestments,
        netSavings,
        categoryBreakdown,
        budgetAllocation,
        transactionCount: transactions.length,
      },
      "Monthly summary retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error, "GET /api/analytics/monthly-summary");
  }
}
