import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { getPrismaClient } from "@/lib/api-utils";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-utils";

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
      if (tx.type === "income") cashTimeline[key] += tx.amount;
      if (tx.type === "expense" || tx.type === "investment") cashTimeline[key] -= tx.amount;
    });

    // Calculate cumulative cash
    let cumulativeCash = 0;
    const cashCumulative: Record<string, number> = {};
    months.forEach(m => {
      cumulativeCash += cashTimeline[m];
      cashCumulative[m] = cumulativeCash;
    });

    // Calculate investment value for each month
    const investmentTimeline: Record<string, { min: number; max: number }> = {};
    months.forEach(m => investmentTimeline[m] = { min: 0, max: 0 });
    for (const inv of investments) {
      const start = new Date(inv.startDate);
      let n = 1;
      if (inv.compoundingFrequency === "monthly") n = 12;
      else if (inv.compoundingFrequency === "quarterly") n = 4;
      else if (inv.compoundingFrequency === "annually") n = 1;
      const rMin = inv.expectedReturnMin / 100;
      const rMax = inv.expectedReturnMax / 100;
      months.forEach((m) => {
        const [year, month] = m.split("-").map(Number);
        const monthDate = new Date(year, month-1, 1);
        if (monthDate < start) return;
        const elapsedMonths = (year - start.getFullYear()) * 12 + (month - (start.getMonth()+1));
        // FV = P * [((1 + r/n)^(n*t) - 1) / (r/n)]
        const t = elapsedMonths / 12;
        const periods = Math.floor(n * t);
        let fvMin = 0, fvMax = 0;
        if (periods > 0 && rMin > 0) {
          fvMin = inv.monthlyContribution * (((1 + rMin / n) ** periods - 1) / (rMin / n));
        } else {
          fvMin = inv.monthlyContribution * periods;
        }
        if (periods > 0 && rMax > 0) {
          fvMax = inv.monthlyContribution * (((1 + rMax / n) ** periods - 1) / (rMax / n));
        } else {
          fvMax = inv.monthlyContribution * periods;
        }
        investmentTimeline[m].min += fvMin;
        investmentTimeline[m].max += fvMax;
      });
    }

    // Build final timeline
    const timeline = months.map(m => ({
      month: m,
      cash: cashCumulative[m],
      investmentsMin: investmentTimeline[m].min,
      investmentsMax: investmentTimeline[m].max,
      netWorthMin: cashCumulative[m] + investmentTimeline[m].min,
      netWorthMax: cashCumulative[m] + investmentTimeline[m].max,
    }));

    return successResponse(timeline, "Net worth timeline generated");
  } catch (error) {
    return handleApiError(error, "GET /api/dashboard/net-worth-timeline");
  }
}
