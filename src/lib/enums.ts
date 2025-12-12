/**
 * Enums for type-safe constants across the application
 */

export enum TransactionType {
  INCOME = "income",
  EXPENSE = "expense",
  INVESTMENT = "investment",
  TRANSFER = "transfer"
}

export enum InvestmentPlanStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  ARCHIVED = "archived"
}

export enum GoalStatus {
  ON_TRACK = "on_track",
  BEHIND = "behind",
  COMPLETED = "completed"
}

export enum CompoundingFrequency {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUALLY = "annually"
}

export enum RecurringFrequency {
  ONCE = "once",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly"
}

export enum BudgetCategory {
  NEEDS = "needs",
  WANTS = "wants",
  SAVINGS = "savings"
}

// Helper functions to get enum values as arrays
export const getTransactionTypes = () => Object.values(TransactionType);
export const getInvestmentPlanStatuses = () => Object.values(InvestmentPlanStatus);
export const getGoalStatuses = () => Object.values(GoalStatus);
export const getCompoundingFrequencies = () => Object.values(CompoundingFrequency);
export const getRecurringFrequencies = () => Object.values(RecurringFrequency);
export const getBudgetCategories = () => Object.values(BudgetCategory);
