import { NextRequest } from "next/server";
import { getPrismaClient, successResponse, handleApiError, errorResponse } from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";

const prisma = getPrismaClient();

/**
 * POST /api/investment-plans/:id/duplicate
 * Duplicate an existing investment plan (what-if scenario starter)
 */
export async function POST(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const id = params?.id as string;

    const plan = await prisma.investmentPlan.findUnique({ where: { id } });
    if (!plan || plan.userId !== userId) {
      return successResponse(null, "Investment plan not found", 404);
    }

    // Create a copy with modified name
    const copy = await prisma.investmentPlan.create({
      data: {
        userId,
        name: `${plan.name} (copy)`,
        monthlyContribution: plan.monthlyContribution,
        expectedReturnMin: plan.expectedReturnMin,
        expectedReturnMax: plan.expectedReturnMax,
        compoundingFrequency: plan.compoundingFrequency,
        annualIncreasePercent: plan.annualIncreasePercent,
        startDate: plan.startDate,
        endDate: plan.endDate,
        status: "paused",
      },
    });

    return successResponse(copy, "Investment plan duplicated successfully", 201);
  } catch (error) {
    return handleApiError(error, "POST /api/investment-plans/:id/duplicate");
  }
}
