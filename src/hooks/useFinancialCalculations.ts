// DEPRECATED: All financial calculations are now backend-driven.
// This file is retained for reference only. Do not use these hooks in production code.

// If you need financial calculations, use backend API endpoints instead.

import { useMemo } from "react";
import { roundToDecimal } from "@/lib/utils";

/**
 * Hook to calculate SIP (Systematic Investment Plan) projection
 * With annual increase and compound interest
 */
export const useSIPProjection = (
  monthlyContribution: number,
  annualReturnMin: number,
  annualReturnMax: number,
  years: number,
  annualIncreasePercent: number = 0,
  compoundingFrequency: string = "monthly"
): {
  projectionMin: Array<{ year: number; invested: number; value: number; interest: number }>;
  projectionMax: Array<{ year: number; invested: number; value: number; interest: number }>;
} => {
  return useMemo(() => {
    const months = years * 12;
    const monthlyReturnMin = annualReturnMin / 100 / 12;
    const monthlyReturnMax = annualReturnMax / 100 / 12;
    const monthlyIncreaseRate = annualIncreasePercent / 100 / 12;

    const calculateProjection = (monthlyReturn: number) => {
      const result = [];
      let balance = 0;
      let totalInvested = 0;
      let currentMonthlyContribution = monthlyContribution;

      for (let month = 1; month <= months; month++) {
        // Apply annual increase every 12 months
        if (month > 1 && (month - 1) % 12 === 0) {
          currentMonthlyContribution *= 1 + annualIncreasePercent / 100;
        }

        // Add monthly contribution
        balance += currentMonthlyContribution;
        totalInvested += currentMonthlyContribution;

        // Apply monthly interest
        balance *= 1 + monthlyReturn;

        // Record year-end data
        if (month % 12 === 0) {
          const year = month / 12;
          const interest = balance - totalInvested;

          result.push({
            year,
            invested: roundToDecimal(totalInvested),
            value: roundToDecimal(balance),
            interest: roundToDecimal(interest),
          });
        }
      }

      return result;
    };

    return {
      projectionMin: calculateProjection(monthlyReturnMin),
      projectionMax: calculateProjection(monthlyReturnMax),
    };
  }, [monthlyContribution, annualReturnMin, annualReturnMax, years, annualIncreasePercent]);
};

/**
 * Hook to aggregate income and expenses by month and category
 */
export const useMonthlyAggregation = (
  transactions: Array<{
    date: Date;
    amount: number;
    category: string;
    type: "income" | "expense";
  }>
): {
  byMonth: Record<string, { income: number; expense: number; net: number }>;
  byCategory: Record<string, { income: number; expense: number; net: number }>;
  total: { income: number; expense: number; net: number };
} => {
  return useMemo(() => {
    const byMonth: Record<string, { income: number; expense: number; net: number }> = {};
    const byCategory: Record<string, { income: number; expense: number; net: number }> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((transaction) => {
      const monthKey = transaction.date.toISOString().substring(0, 7); // YYYY-MM

      // Aggregate by month
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { income: 0, expense: 0, net: 0 };
      }

      // Aggregate by category
      if (!byCategory[transaction.category]) {
        byCategory[transaction.category] = { income: 0, expense: 0, net: 0 };
      }

      const amount = transaction.type === "income" ? transaction.amount : -transaction.amount;

      if (transaction.type === "income") {
        byMonth[monthKey].income += transaction.amount;
        byCategory[transaction.category].income += transaction.amount;
        totalIncome += transaction.amount;
      } else {
        byMonth[monthKey].expense += transaction.amount;
        byCategory[transaction.category].expense += transaction.amount;
        totalExpense += transaction.amount;
      }
    });

    // Calculate net for each month
    Object.keys(byMonth).forEach((month) => {
      byMonth[month].net = roundToDecimal(byMonth[month].income - byMonth[month].expense);
      byMonth[month].income = roundToDecimal(byMonth[month].income);
      byMonth[month].expense = roundToDecimal(byMonth[month].expense);
    });

    // Calculate net for each category
    Object.keys(byCategory).forEach((category) => {
      byCategory[category].net = roundToDecimal(byCategory[category].income - byCategory[category].expense);
      byCategory[category].income = roundToDecimal(byCategory[category].income);
      byCategory[category].expense = roundToDecimal(byCategory[category].expense);
    });

    return {
      byMonth,
      byCategory,
      total: {
        income: roundToDecimal(totalIncome),
        expense: roundToDecimal(totalExpense),
        net: roundToDecimal(totalIncome - totalExpense),
      },
    };
  }, [transactions]);
};

/**
 * Hook to analyze budget against the 50-30-20 rule
 */
export const useBudgetAnalysis = (
  transactions: Array<{
    date: Date;
    amount: number;
    category: string;
    type: "income" | "expense";
  }>,
  budgetRule: {
    needsPercent: number;
    wantsPercent: number;
    savingsPercent: number;
  },
  categoryClassification: Record<string, "needs" | "wants" | "savings">
): {
  needs: { actual: number; budget: number; percentage: number; remaining: number };
  wants: { actual: number; budget: number; percentage: number; remaining: number };
  savings: { actual: number; budget: number; percentage: number; remaining: number };
  totalIncome: number;
  totalExpense: number;
} => {
  return useMemo(() => {
    // Calculate total income for the period
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    // Get only expense transactions
    const expenses = transactions.filter((t) => t.type === "expense");

    let needsAmount = 0;
    let wantsAmount = 0;
    let savingsAmount = 0;

    expenses.forEach((transaction) => {
      const classification = categoryClassification[transaction.category] || "wants";
      switch (classification) {
        case "needs":
          needsAmount += transaction.amount;
          break;
        case "wants":
          wantsAmount += transaction.amount;
          break;
        case "savings":
          savingsAmount += transaction.amount;
          break;
      }
    });

    const needsBudget = (budgetRule.needsPercent / 100) * totalIncome;
    const wantsBudget = (budgetRule.wantsPercent / 100) * totalIncome;
    const savingsBudget = (budgetRule.savingsPercent / 100) * totalIncome;

    return {
      needs: {
        actual: roundToDecimal(needsAmount),
        budget: roundToDecimal(needsBudget),
        percentage: roundToDecimal((needsAmount / totalIncome) * 100),
        remaining: roundToDecimal(needsBudget - needsAmount),
      },
      wants: {
        actual: roundToDecimal(wantsAmount),
        budget: roundToDecimal(wantsBudget),
        percentage: roundToDecimal((wantsAmount / totalIncome) * 100),
        remaining: roundToDecimal(wantsBudget - wantsAmount),
      },
      savings: {
        actual: roundToDecimal(savingsAmount),
        budget: roundToDecimal(savingsBudget),
        percentage: roundToDecimal((savingsAmount / totalIncome) * 100),
        remaining: roundToDecimal(savingsBudget - savingsAmount),
      },
      totalIncome: roundToDecimal(totalIncome),
      totalExpense: roundToDecimal(needsAmount + wantsAmount + savingsAmount),
    };
  }, [transactions, budgetRule, categoryClassification]);
};

/**
 * Hook to calculate net worth over time
 */
export const useNetWorthTimeline = (
  monthlyTransactions: Record<
    string,
    { income: number; expense: number }
  >,
  investmentProjection: Array<{ year: number; value: number }>,
  startingBalance: number = 0
): Array<{
  month: string;
  year: number;
  cash: number;
  investments: number;
  netWorth: number;
}> => {
  return useMemo(() => {
    const timeline: Array<{
      month: string;
      year: number;
      cash: number;
      investments: number;
      netWorth: number;
    }> = [];

    let cumulativeCash = startingBalance;
    const months = Object.entries(monthlyTransactions).sort();

    months.forEach(([monthKey, { income, expense }]) => {
      cumulativeCash += income - expense;

      // Extract year from monthKey (YYYY-MM)
      const year = parseInt(monthKey.substring(0, 4));

      // Find corresponding investment value
      const investmentValue =
        investmentProjection.find((p) => p.year === year)?.value || 0;

      timeline.push({
        month: monthKey,
        year,
        cash: roundToDecimal(cumulativeCash),
        investments: roundToDecimal(investmentValue),
        netWorth: roundToDecimal(cumulativeCash + investmentValue),
      });
    });

    return timeline;
  }, [monthlyTransactions, investmentProjection, startingBalance]);
};
