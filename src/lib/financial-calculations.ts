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
    // Calculate elapsed months
    const monthsElapsed = Math.max(0, Math.floor(
      (now.getTime() - inv.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    ));

    if (monthsElapsed === 0) continue;

    // Monthly interest rate
    const monthlyRateMin = inv.expectedReturnMin / 100 / 12;
    const monthlyRateMax = inv.expectedReturnMax / 100 / 12;
    const P = inv.monthlyContribution;

    // SIP Future Value Formula: FV = P × [(1 + r)^n - 1] / r × (1 + r)
    // where P = monthly contribution, r = monthly rate, n = number of months
    let fvMin = 0;
    let fvMax = 0;

    if (monthlyRateMin > 0) {
      fvMin = P * (((1 + monthlyRateMin) ** monthsElapsed - 1) / monthlyRateMin) * (1 + monthlyRateMin);
    } else {
      fvMin = P * monthsElapsed;
    }

    if (monthlyRateMax > 0) {
      fvMax = P * (((1 + monthlyRateMax) ** monthsElapsed - 1) / monthlyRateMax) * (1 + monthlyRateMax);
    } else {
      fvMax = P * monthsElapsed;
    }

    minValue += Math.max(0, fvMin);
    maxValue += Math.max(0, fvMax);
  }

  return {
    minNetWorth: Math.round((bankBalance + minValue) * 100) / 100,
    maxNetWorth: Math.round((bankBalance + maxValue) * 100) / 100,
  };
}

/**
 * Calculate goal progress based on investment plans linked to this goal
 */
export async function getGoalProgress(userId: string, goalId: string): Promise<number> {
  // Get goal target
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) return 0;

  // Get investment plans linked to this goal
  const investmentPlans = await prisma.investmentPlan.findMany({
    where: { userId, goalId, status: "active" },
    select: { monthlyContribution: true, startDate: true },
  });

  // Calculate total contributed through investment plans
  let contributed = 0;
  const now = new Date();

  for (const plan of investmentPlans) {
    const monthsElapsed = Math.max(0, Math.floor(
      (now.getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    ));
    contributed += plan.monthlyContribution * monthsElapsed;
  }

  // Return progress percentage
  return Math.min(100, Math.round((contributed / goal.targetAmount) * 100 * 100) / 100);
}
