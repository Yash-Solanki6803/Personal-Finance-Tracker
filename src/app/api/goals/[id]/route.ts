import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { GoalUpdateSchema } from "@/lib/schemas";

const prisma = getPrismaClient();

/**
 * GET /api/goals/:id
 * Get a single goal by ID
 */
export async function GET(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const id = params?.id as string;

    const goal = await prisma.goal.findUnique({ where: { id } });

    if (!goal || goal.userId !== userId) {
      return errorResponse("Goal not found", 404);
    }

    return successResponse(goal, "Goal retrieved successfully");
  } catch (error) {
    return handleApiError(error, "GET /api/goals/[id]");
  }
}

/**
 * PUT /api/goals/:id
 * Update a goal
 */
export async function PUT(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const id = params?.id as string;

    // Verify ownership
    const existingGoal = await prisma.goal.findUnique({ where: { id } });
    if (!existingGoal || existingGoal.userId !== userId) {
      return errorResponse("Goal not found or unauthorized", 404);
    }

    const body = await validateBody(request);

    // Normalize date field
    const normalized: any = { ...body };
    if (body.targetAmount !== undefined) {
      normalized.targetAmount = Number(body.targetAmount);
    }
    if (body.targetDate) {
      normalized.targetDate = new Date(body.targetDate);
    }

    // Validate request body
    const validatedData = GoalUpdateSchema.parse(normalized);

    // Update goal
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.targetAmount !== undefined) updateData.targetAmount = validatedData.targetAmount;
    if (validatedData.targetDate !== undefined) updateData.targetDate = validatedData.targetDate;
    if (validatedData.description !== undefined) updateData.description = validatedData.description ?? null;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
    });

    return successResponse(goal, "Goal updated successfully");
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "PUT /api/goals/[id]");
  }
}

/**
 * DELETE /api/goals/:id
 * Delete a goal
 */
export async function DELETE(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const id = params?.id as string;

    // Verify ownership
    const existingGoal = await prisma.goal.findUnique({ where: { id } });
    if (!existingGoal || existingGoal.userId !== userId) {
      return errorResponse("Goal not found or unauthorized", 404);
    }

    const goal = await prisma.goal.delete({
      where: { id },
    });

    return successResponse(goal, "Goal deleted successfully");
  } catch (error) {
    return handleApiError(error, "DELETE /api/goals/[id]");
  }
}

