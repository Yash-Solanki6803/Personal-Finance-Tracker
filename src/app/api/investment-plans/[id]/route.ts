import { NextRequest } from "next/server";
import { successResponse, handleApiError, getPrismaClient, errorResponse } from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";

const prisma = getPrismaClient();

/**
 * GET /api/investment-plans/:id
 * Return a single investment plan by id
 */
export async function GET(request: NextRequest, context: any) {
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

    return successResponse(plan, "Investment plan retrieved successfully");
  } catch (error) {
    return handleApiError(error, "GET /api/investment-plans/:id");
  }
}

/**
 * DELETE /api/investment-plans/:id
 * Delete an investment plan by id
 */
export async function DELETE(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const id = params?.id as string;

    // Check if plan exists and belongs to user
    const plan = await prisma.investmentPlan.findUnique({ where: { id } });

    if (!plan || plan.userId !== userId) {
      return errorResponse("Investment plan not found or unauthorized", 404);
    }

    // Delete the investment plan
    await prisma.investmentPlan.delete({ where: { id } });

    // Write audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: "investment_plan_deleted",
        details: JSON.stringify({ planId: id, planName: plan.name }),
      },
    });

    return successResponse(null, "Investment plan deleted successfully");
  } catch (error) {
    return handleApiError(error, "DELETE /api/investment-plans/:id");
  }
}
