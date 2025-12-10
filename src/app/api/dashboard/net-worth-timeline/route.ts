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

    // Calculate investment value for each month using proper SIP formula
    const investmentTimeline: Record<string, { min: number; max: number }> = {};
    months.forEach(m => investmentTimeline[m] = { min: 0, max: 0 });
    for (const inv of investments) {
      const start = new Date(inv.startDate);
      const monthlyRateMin = inv.expectedReturnMin / 100 / 12;
      const monthlyRateMax = inv.expectedReturnMax / 100 / 12;
      const P = inv.monthlyContribution;

      months.forEach((m) => {
        const [year, month] = m.split("-").map(Number);
        const monthDate = new Date(year, month-1, 1);
        if (monthDate < start) return;

        // Calculate elapsed months
        const elapsedMonths = Math.max(0, (year - start.getFullYear()) * 12 + (month - (start.getMonth()+1)));
        if (elapsedMonths === 0) return;

        // SIP Future Value Formula: FV = P × [(1 + r)^n - 1] / r × (1 + r)
        let fvMin = 0, fvMax = 0;
        if (monthlyRateMin > 0) {
          fvMin = P * (((1 + monthlyRateMin) ** elapsedMonths - 1) / monthlyRateMin) * (1 + monthlyRateMin);
        } else {
          fvMin = P * elapsedMonths;
        }
        if (monthlyRateMax > 0) {
          fvMax = P * (((1 + monthlyRateMax) ** elapsedMonths - 1) / monthlyRateMax) * (1 + monthlyRateMax);
        } else {
          fvMax = P * elapsedMonths;
        }

        investmentTimeline[m].min += Math.max(0, fvMin);
        investmentTimeline[m].max += Math.max(0, fvMax);
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
