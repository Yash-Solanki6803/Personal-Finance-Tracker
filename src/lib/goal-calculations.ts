import { roundToDecimal } from "./utils";

/**
 * Calculate required monthly SIP to reach a target amount by target date
 * Formula: PMT = FV / sum of all contributions with growth factor
 * Accounts for annual increase in deposits
 * Where:
 * - FV = Future Value (target amount)
 * - r = monthly interest rate
 * - n = number of months
 * - annualIncreasePercent = annual increase in monthly contribution
 * - PMT = monthly payment (SIP)
 */
export const calculateRequiredSIP = (
  targetAmount: number,
  targetDate: Date,
  expectedReturnPercent: number = 12, // Default 12% annual return
  compoundingFrequency: string = "monthly",
  annualIncreasePercent: number = 10 // Default 10% annual increase
): number => {
  const now = new Date();
  const months = Math.max(
    1,
    Math.ceil(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
  );

  if (months <= 0) {
    return 0; // Target date is in the past
  }

  // Calculate monthly return rate - this is always monthly regardless of compounding
  // because we're making monthly contributions
  const monthlyRate = expectedReturnPercent / 100 / 12;

  // Calculate the future value factor accounting for annual increases
  // Using iterative approach to handle annual increases
  let futureValueFactor = 0;
  let annualIncreaseRate = annualIncreasePercent / 100;

  for (let month = 0; month < months; month++) {
    // Calculate which year this month falls into (0-indexed)
    const yearsElapsed = Math.floor(month / 12);
    // Contribution grows by annualIncreaseRate each year
    const growthMultiplier = Math.pow(1 + annualIncreaseRate, yearsElapsed);
    // Compound the growth factor for remaining months
    const monthsFromNow = months - month - 1;
    futureValueFactor += growthMultiplier * Math.pow(1 + monthlyRate, monthsFromNow);
  }

  if (futureValueFactor === 0) {
    return roundToDecimal(targetAmount / months);
  }

  const monthlySIP = targetAmount / futureValueFactor;
  return roundToDecimal(monthlySIP);
};

/**
 * Calculate current progress towards a goal
 * Based on investment plans and their projected values
 */
export const calculateGoalProgress = (
  targetAmount: number,
  targetDate: Date,
  currentInvestments: number = 0,
  monthlySIP: number = 0,
  expectedReturnPercent: number = 12,
  annualIncreasePercent: number = 10 // Default 10% annual increase
): {
  currentValue: number;
  projectedValue: number;
  progressPercent: number;
  status: "on_track" | "behind" | "completed";
  requiredSIP: number;
} => {
  const now = new Date();
  const monthsRemaining = Math.max(
    0,
    Math.ceil(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
  );

  // Calculate projected value with current SIP and annual increases
  const monthlyRate = expectedReturnPercent / 100 / 12;
  const annualIncreaseRate = annualIncreasePercent / 100;
  let projectedValue = currentInvestments;
  let currentMonthlySIP = monthlySIP;

  // Project future value with monthly contributions that increase annually
  for (let i = 0; i < monthsRemaining; i++) {
    // Increase SIP at the start of each year (month 12, 24, 36, etc.)
    if (i > 0 && i % 12 === 0) {
      currentMonthlySIP *= 1 + annualIncreaseRate;
    }
    // Add contribution first, then apply interest
    projectedValue = (projectedValue + currentMonthlySIP) * (1 + monthlyRate);
  }

  projectedValue = roundToDecimal(projectedValue);
  const progressPercent = roundToDecimal((projectedValue / targetAmount) * 100);

  // Calculate required SIP with annual increases
  const requiredSIP = calculateRequiredSIP(
    targetAmount,
    targetDate,
    expectedReturnPercent,
    "monthly",
    annualIncreasePercent
  );

  // Determine status
  let status: "on_track" | "behind" | "completed";
  if (progressPercent >= 100) {
    status = "completed";
  } else if (monthlySIP >= requiredSIP * 0.9) {
    // Within 90% of required SIP is considered "on track"
    status = "on_track";
  } else {
    status = "behind";
  }

  return {
    currentValue: roundToDecimal(currentInvestments),
    projectedValue,
    progressPercent,
    status,
    requiredSIP,
  };
};

