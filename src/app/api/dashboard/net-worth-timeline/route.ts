import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { getPrismaClient } from "@/lib/api-utils";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-utils";
import { TransactionType } from "@/lib/enums";

const prisma = getPrismaClient();

/**
 * GET /api/dashboard/net-worth-timeline
 * Returns monthly net worth timeline for the user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    // Get all transactions for user
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      select: { amount: true, type: true, date: true },
    });

    // Get all active investment plans for user
    const investments = await prisma.investmentPlan.findMany({
      where: { userId, status: "active" },
      select: {
        monthlyContribution: true,
        expectedReturnMin: true,
        expectedReturnMax: true,
        startDate: true,
        compoundingFrequency: true,
      },
    });

    // Build monthly timeline from earliest transaction to now
    const months: string[] = [];
    const now = new Date();
    let minDate = transactions.length > 0 ? new Date(transactions[0].date) : now;
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d < minDate) minDate = d;
    });
    minDate.setDate(1);
    const cur = new Date(minDate);
    while (cur <= now) {
      months.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}`);
      cur.setMonth(cur.getMonth() + 1);
    }

    // Aggregate cash by month
    const cashTimeline: Record<string, number> = {};
    months.forEach(m => cashTimeline[m] = 0);
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!(key in cashTimeline)) return;
      if (tx.type === TransactionType.INCOME) cashTimeline[key] += tx.amount;
      if (tx.type === TransactionType.EXPENSE || tx.type === TransactionType.INVESTMENT) cashTimeline[key] -= tx.amount;
    });

    // Calculate cumulative cash
    let cumulativeCash = 0;
    const cashCumulative: Record<string, number> = {};
    months.forEach(m => {
      cumulativeCash += cashTimeline[m];
      cashCumulative[m] = cumulativeCash;
    });

    // Calculate actual investment value for each month
    const investmentTimeline: Record<string, number> = {};
    months.forEach(m => investmentTimeline[m] = 0);

    // Get all investment transactions
    const allInvestmentTransactions = await prisma.investmentTransaction.findMany({
      where: { userId },
      select: { amount: true, year: true, month: true },
    });

    // Aggregate investments by month
    allInvestmentTransactions.forEach(inv => {
      const key = `${inv.year}-${String(inv.month).padStart(2, "0")}`;
      if (key in investmentTimeline) {
        investmentTimeline[key] += inv.amount;
      }
    });

    // Calculate cumulative investments
    let cumulativeInvestments = 0;
    const investmentsCumulative: Record<string, number> = {};
    months.forEach(m => {
      cumulativeInvestments += investmentTimeline[m];
      investmentsCumulative[m] = cumulativeInvestments;
    });

    // Build final timeline
    const timeline = months.map(m => ({
      month: m,
      cash: cashCumulative[m],
      investments: investmentsCumulative[m],
      netWorth: cashCumulative[m] + investmentsCumulative[m],
    }));

    return successResponse(timeline, "Net worth timeline generated");
  } catch (error) {
    return handleApiError(error, "GET /api/dashboard/net-worth-timeline");
  }
}
