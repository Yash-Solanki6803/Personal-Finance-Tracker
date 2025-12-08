import { NextRequest } from "next/server";
import {
  errorResponse,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import * as XLSX from "xlsx";

const prisma = getPrismaClient();

/**
 * GET /api/export/xlsx
 * Export user's financial data to XLSX format
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    // Fetch all user data in parallel
    const [transactions, goals, investmentPlans, salaries, budgetRule] =
      await Promise.all([
        prisma.transaction.findMany({
          where: { userId },
          orderBy: { date: "desc" },
        }),
        prisma.goal.findMany({
          where: { userId },
          orderBy: { targetDate: "asc" },
        }),
        prisma.investmentPlan.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.salary.findMany({
          where: { userId },
          orderBy: { lastUpdatedDate: "desc" },
        }),
        prisma.budgetRule.findFirst({
          where: { userId },
        }),
      ]);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Transactions
    if (transactions.length > 0) {
      const transactionData = transactions.map((t) => ({
        Date: new Date(t.date).toLocaleDateString(),
        Category: t.category,
        Type: t.type,
        Amount: t.amount,
        Description: t.description || "",
      }));
      const ws1 = XLSX.utils.json_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(wb, ws1, "Transactions");
    }

    // Sheet 2: Goals
    if (goals.length > 0) {
      const goalData = goals.map((g) => ({
        "Goal Name": g.name,
        "Target Amount": g.targetAmount,
        "Target Date": new Date(g.targetDate).toLocaleDateString(),
        Status: g.status,
        Description: g.description || "",
      }));
      const ws2 = XLSX.utils.json_to_sheet(goalData);
      XLSX.utils.book_append_sheet(wb, ws2, "Goals");
    }

    // Sheet 3: Investment Plans
    if (investmentPlans.length > 0) {
      const planData = investmentPlans.map((p) => ({
        "Plan Name": p.name,
        "Monthly Contribution": p.monthlyContribution,
        "Expected Return Min": p.expectedReturnMin,
        "Expected Return Max": p.expectedReturnMax,
        "Compounding Frequency": p.compoundingFrequency,
        "Annual Increase %": p.annualIncreasePercent,
        "Start Date": new Date(p.startDate).toLocaleDateString(),
        "End Date": p.endDate ? new Date(p.endDate).toLocaleDateString() : "",
        Status: p.status,
      }));
      const ws3 = XLSX.utils.json_to_sheet(planData);
      XLSX.utils.book_append_sheet(wb, ws3, "Investment Plans");
    }

    // Sheet 4: Salary
    if (salaries.length > 0) {
      const salaryData = salaries.map((s) => ({
        Amount: s.amount,
        "Last Updated": new Date(s.lastUpdatedDate).toLocaleDateString(),
      }));
      const ws4 = XLSX.utils.json_to_sheet(salaryData);
      XLSX.utils.book_append_sheet(wb, ws4, "Salary");
    }

    // Sheet 5: Budget Rule
    if (budgetRule) {
      const budgetData = [
        {
          Category: "Needs",
          Percentage: budgetRule.needsPercent,
        },
        {
          Category: "Wants",
          Percentage: budgetRule.wantsPercent,
        },
        {
          Category: "Savings",
          Percentage: budgetRule.savingsPercent,
        },
      ];
      const ws5 = XLSX.utils.json_to_sheet(budgetData);
      XLSX.utils.book_append_sheet(wb, ws5, "Budget Rules");
    }

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    // Return as file download
    const filename = `FinanceTracker_Export_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new Response(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/export/xlsx] Error:", error);
    return handleApiError(error, "GET /api/export/xlsx");
  }
}
