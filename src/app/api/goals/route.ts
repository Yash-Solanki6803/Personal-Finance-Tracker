import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { GoalSchema, GoalUpdateSchema } from "@/lib/schemas";

const prisma = getPrismaClient();

/**
 * GET /api/goals
 * List all goals
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const goals = await prisma.goal.findMany({
      where,
      orderBy: { targetDate: "asc" },
    });

    // Attach backend-driven progress to each goal
    const { getGoalProgress } = await import("@/lib/financial-calculations");
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => ({
        ...goal,
        progress: await getGoalProgress(userId, goal.id),
      }))
    );

    return successResponse(goalsWithProgress, "Goals retrieved successfully");
  } catch (error) {
    return handleApiError(error, "GET /api/goals");
  }
}

/**
 * POST /api/goals
 * Create a new goal
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await validateBody(request);

    // Normalize date field
    const normalized = {
      ...body,
      targetAmount: body.targetAmount !== undefined ? Number(body.targetAmount) : undefined,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      status: body.status || "on_track",
    };

    // Validate request body
    const validatedData = GoalSchema.parse(normalized as any);

    // Ensure targetDate is a Date object
    const targetDateValue = validatedData.targetDate instanceof Date
      ? validatedData.targetDate
      : new Date(validatedData.targetDate);

    // Create goal
    const goal = await prisma.goal.create({
      data: {
        userId,
        name: validatedData.name,
        targetAmount: validatedData.targetAmount,
        targetDate: targetDateValue,
        description: validatedData.description ?? null,
        status: validatedData.status || "on_track",
      },
    });

    // Write audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: "goal_created",
        details: JSON.stringify({ goalId: goal.id, goalName: goal.name, targetAmount: goal.targetAmount }),
      },
    });

    return successResponse(goal, "Goal created successfully", 201);
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "POST /api/goals");
  }
}
