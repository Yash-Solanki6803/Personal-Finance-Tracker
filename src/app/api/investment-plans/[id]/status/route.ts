import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";

const prisma = getPrismaClient();

/**
 * PATCH /api/investment-plans/:id/status
 * Update investment plan status (active, paused, archived)
 */
export async function PATCH(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const id = params?.id as string;
    const body = await validateBody(request);

    const { status } = body;

    // Validate status
    if (!["active", "paused", "archived"].includes(status)) {
      return errorResponse(
        "Invalid status. Must be 'active', 'paused', or 'archived'",
        400
      );
    }

    // Verify ownership
    const existingPlan = await prisma.investmentPlan.findUnique({ where: { id } });
    if (!existingPlan || existingPlan.userId !== userId) {
      return errorResponse("Plan not found or unauthorized", 404);
    }

    // Update investment plan status
    const plan = await prisma.investmentPlan.update({
      where: { id },
      data: { status },
    });

    return successResponse(plan, `Investment plan ${status} successfully`);
  } catch (error) {
    return handleApiError(error, "PATCH /api/investment-plans/:id/status");
  }
}
