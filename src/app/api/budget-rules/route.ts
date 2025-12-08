import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { BudgetRuleSchema, BudgetRuleUpdateSchema } from "@/lib/schemas";

const prisma = getPrismaClient();

/**
 * GET /api/budget-rules
 * Get current budget rule for the user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const rule = await prisma.budgetRule.findFirst({
      where: { userId },
    });

    if (!rule) {
      return errorResponse("No budget rule found", 404);
    }

    return successResponse(rule, "Budget rule retrieved successfully");
  } catch (error) {
    return handleApiError(error, "GET /api/budget-rules");
  }
}

/**
 * PUT /api/budget-rules
 * Update the budget rule for the user
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await validateBody(request);

    // Validate request body
    const validatedData = BudgetRuleUpdateSchema.parse(body);

    // Get existing rule for user or create if not exists
    let rule = await prisma.budgetRule.findFirst({
      where: { userId },
    });

    if (!rule) {
      // Create default rule if none exists for this user
      rule = await prisma.budgetRule.create({
        data: {
          userId,
          needsPercent: 50,
          wantsPercent: 30,
          savingsPercent: 20,
        },
      });
    }

    // Update the rule
    const updatedRule = await prisma.budgetRule.update({
      where: { id: rule.id },
      data: validatedData,
    });

    return successResponse(updatedRule, "Budget rule updated successfully");
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "PUT /api/budget-rules");
  }
}
