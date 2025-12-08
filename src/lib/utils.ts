import { differenceInDays, differenceInMonths, startOfMonth, endOfMonth, addMonths, addYears, addDays } from "date-fns";

/**
 * Calculate the number of days between two dates
 */
export const getDaysBetween = (startDate: Date, endDate: Date): number => {
  return Math.abs(differenceInDays(endDate, startDate));
};

/**
 * Calculate the number of months between two dates
 */
export const getMonthsBetween = (startDate: Date, endDate: Date): number => {
  return Math.abs(differenceInMonths(endDate, startDate));
};

/**
 * Get the first day of the month for a given date
 */
export const getMonthStart = (date: Date): Date => {
  return startOfMonth(date);
};

/**
 * Get the last day of the month for a given date
 */
export const getMonthEnd = (date: Date): Date => {
  return endOfMonth(date);
};

/**
 * Add months to a date
 */
export const addMonthsToDate = (date: Date, months: number): Date => {
  return addMonths(date, months);
};

/**
 * Add years to a date
 */
export const addYearsToDate = (date: Date, years: number): Date => {
  return addYears(date, years);
};

/**
 * Format a number as currency (INR by default)
 */
export const formatCurrency = (amount: number, currency: string = "INR"): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format a number as percentage
 */
export const formatPercentage = (value: number, decimalPlaces: number = 2): string => {
  return `${(value * 100).toFixed(decimalPlaces)}%`;
};

/**
 * Round a number to a specific number of decimal places
 */
export const roundToDecimal = (value: number, decimalPlaces: number = 2): number => {
  return Math.round(value * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
};

/**
 * Group transactions by month
 */
export const groupByMonth = (
  transactions: Array<{ date: Date; [key: string]: any }>
): Record<string, Array<{ date: Date; [key: string]: any }>> => {
  return transactions.reduce(
    (acc, transaction) => {
      const monthKey = transaction.date.toISOString().substring(0, 7); // YYYY-MM format
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(transaction);
      return acc;
    },
    {} as Record<string, Array<{ date: Date; [key: string]: any }>>
  );
};

/**
 * Group transactions by category
 */
export const groupByCategory = (
  transactions: Array<{ category: string; [key: string]: any }>
): Record<string, Array<{ category: string; [key: string]: any }>> => {
  return transactions.reduce(
    (acc, transaction) => {
      if (!acc[transaction.category]) {
        acc[transaction.category] = [];
      }
      acc[transaction.category].push(transaction);
      return acc;
    },
    {} as Record<string, Array<{ category: string; [key: string]: any }>>
  );
};

/**
 * Sum amounts in an array of transactions
 */
export const sumAmounts = (transactions: Array<{ amount: number }>): number => {
  return roundToDecimal(
    transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  );
};

/**
 * Calculate average amount from transactions
 */
export const averageAmount = (transactions: Array<{ amount: number }>): number => {
  if (transactions.length === 0) return 0;
  return roundToDecimal(sumAmounts(transactions) / transactions.length);
};

/**
 * Calculate the frequency of compound interest based on string
 * @param frequency - 'monthly', 'quarterly', 'annually'
 * @returns number of times interest compounds per year
 */
export const getCompoundingFrequency = (frequency: string): number => {
  switch (frequency.toLowerCase()) {
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "annually":
      return 1;
    default:
      return 12; // Default to monthly
  }
};

/**
 * Parse recurring frequency to days
 * @param frequency - 'once', 'daily', 'weekly', 'monthly', 'yearly'
 * @returns number of days
 */
export const frequencyToDays = (frequency: string): number => {
  switch (frequency.toLowerCase()) {
    case "once":
      return 0;
    case "daily":
      return 1;
    case "weekly":
      return 7;
    case "monthly":
      return 30; // Approximate
    case "yearly":
      return 365;
    default:
      return 0;
  }
};

/**
 * Get next due date for a recurring transaction
 */
export const getNextDueDate = (currentDate: Date, frequency: string): Date => {
  const freq = frequency?.toLowerCase();
  if (freq === "once") return new Date(8640000000000000); // Far future sentinel for 'once'

  const d = new Date(currentDate);
  switch (freq) {
    case "daily":
      return addDays(d, 1);
    case "weekly":
      return addDays(d, 7);
    case "monthly":
      return addMonths(d, 1);
    case "yearly":
      return addYears(d, 1);
    default:
      // Fallback to monthly increment
      return addMonths(d, 1);
  }
};
