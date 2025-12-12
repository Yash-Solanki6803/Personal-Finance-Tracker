import { PrismaClient } from "@/generated/prisma/client";
import { TransactionType } from "./enums";

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
    if (tx.type === TransactionType.INCOME) balance += tx.amount;
    if (tx.type === TransactionType.EXPENSE || tx.type === TransactionType.INVESTMENT) balance -= tx.amount;
    // transfer: ignore for now, or handle if multi-account
  }
  return balance;
}

/**
 * Calculate user's net worth
 * Sums bank balance and actual investment value
 */
export async function getNetWorth(userId: string): Promise<{ minNetWorth: number; maxNetWorth: number }> {
  const bankBalance = await getBankBalance(userId);

  // Get all active investment plans
  const activePlans = await prisma.investmentPlan.findMany({
    where: { userId, status: "active" },
    select: { id: true },
  });

  // Calculate total actual investments (from InvestmentTransaction records)
  let totalInvested = 0;
  for (const plan of activePlans) {
    const investments = await prisma.investmentTransaction.findMany({
      where: { investmentPlanId: plan.id },
      select: { amount: true },
    });
    totalInvested += investments.reduce((sum, inv) => sum + inv.amount, 0);
  }

  // For now, return actual invested amount as both min and max
  // Future enhancement: apply returns based on actual time and rates
  return {
    minNetWorth: Math.round((bankBalance + totalInvested) * 100) / 100,
    maxNetWorth: Math.round((bankBalance + totalInvested) * 100) / 100,
  };
}

/**
 * Calculate goal progress based on actual investment transactions
 */
export async function getGoalProgress(userId: string, goalId: string): Promise<number> {
  // Get goal target
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) return 0;

  // Get investment plans linked to this goal
  const investmentPlans = await prisma.investmentPlan.findMany({
    where: { userId, goalId },
    select: { id: true },
  });

  // Calculate total actual contributions through investment transactions
  let contributed = 0;
  for (const plan of investmentPlans) {
    const investments = await prisma.investmentTransaction.findMany({
      where: { investmentPlanId: plan.id },
      select: { amount: true },
    });
    contributed += investments.reduce((sum, inv) => sum + inv.amount, 0);
  }

  // Return progress percentage
  return Math.min(100, Math.round((contributed / goal.targetAmount) * 100 * 100) / 100);
}
