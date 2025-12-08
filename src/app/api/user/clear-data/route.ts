import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";

const prisma = getPrismaClient();

/**
 * POST /api/user/clear-data
 * Clear all user-specific data while preserving the user account
 * This allows users to reset their application state without losing their account
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    // Delete all user data in the correct order (respecting foreign key constraints)
    const deletedTransactions = await prisma.transaction.deleteMany({
      where: { userId },
    });

    const deletedRecurringTransactions =
      await prisma.recurringTransaction.deleteMany({
        where: { userId },
      });

    const deletedInvestmentPlans = await prisma.investmentPlan.deleteMany({
      where: { userId },
    });

    const deletedSalaries = await prisma.salary.deleteMany({
      where: { userId },
    });

    const deletedGoals = await prisma.goal.deleteMany({
      where: { userId },
    });

    // Note: BudgetRule is NOT deleted - we keep it with defaults
    // Note: User record is NOT deleted - user account persists

    return successResponse(
      {
        deletedTransactions: deletedTransactions.count,
        deletedRecurringTransactions: deletedRecurringTransactions.count,
        deletedInvestmentPlans: deletedInvestmentPlans.count,
        deletedSalaries: deletedSalaries.count,
        deletedGoals: deletedGoals.count,
      },
      "User data cleared successfully"
    );
  } catch (error) {
    console.error("[POST /api/user/clear-data] Error:", error);
    return handleApiError(error, "POST /api/user/clear-data");
  }
}
