import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

/**
 * Calculate user's current bank balance
 * Sums all income, subtracts all expenses and investments
 */
export async function getBankBalance(userId: string): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { amount: true, type: true },
  });
  let balance = 0;
  for (const tx of transactions) {
    if (tx.type === "income") balance += tx.amount;
    if (tx.type === "expense" || tx.type === "investment") balance -= tx.amount;
    // transfer: ignore for now, or handle if multi-account
  }
  return balance;
}

/**
 * Calculate user's net worth
 * Sums bank balance and investment value
 */
export async function getNetWorth(userId: string): Promise<{ minNetWorth: number; maxNetWorth: number }> {
  const bankBalance = await getBankBalance(userId);
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
  const now = new Date();
  let minValue = 0;
  let maxValue = 0;
  for (const inv of investments) {
    // Calculate elapsed years
    const years = (now.getTime() - inv.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    // Compounding periods per year
    let n = 1;
    if (inv.compoundingFrequency === "monthly") n = 12;
    else if (inv.compoundingFrequency === "quarterly") n = 4;
    else if (inv.compoundingFrequency === "annually") n = 1;
    // Compound interest formula for recurring monthly contributions (future value of an ordinary annuity)
    // FV = P * [((1 + r/n)^(n*t) - 1) / (r/n)]
    const rMin = inv.expectedReturnMin / 100;
    const rMax = inv.expectedReturnMax / 100;
    const P = inv.monthlyContribution;
    const periods = Math.floor(n * years);
    let fvMin = 0;
    let fvMax = 0;
    if (periods > 0 && rMin > 0) {
      fvMin = P * (((1 + rMin / n) ** periods - 1) / (rMin / n));
    } else {
      fvMin = P * periods;
    }
    if (periods > 0 && rMax > 0) {
      fvMax = P * (((1 + rMax / n) ** periods - 1) / (rMax / n));
    } else {
      fvMax = P * periods;
    }
    minValue += fvMin;
    maxValue += fvMax;
  }
  return {
    minNetWorth: bankBalance + minValue,
    maxNetWorth: bankBalance + maxValue,
  };
}

/**
 * Calculate goal progress based on transactions and investments
 */
export async function getGoalProgress(userId: string, goalId: string): Promise<number> {
  // Sum all transactions and investments linked to this goal
  const transactions = await prisma.transaction.findMany({
    where: { userId, category: goalId },
    select: { amount: true, type: true },
  });
  let contributed = 0;
  for (const tx of transactions) {
    if (tx.type === "income" || tx.type === "investment") contributed += tx.amount;
  }
  // Get goal target
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) return 0;
  return Math.min(100, (contributed / goal.targetAmount) * 100);
}
