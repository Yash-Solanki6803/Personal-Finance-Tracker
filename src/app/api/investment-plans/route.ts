import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { InvestmentPlanSchema, InvestmentPlanUpdateSchema } from "@/lib/schemas";

const prisma = getPrismaClient();

/**
 * GET /api/investment-plans
 * List all investment plans with optional filtering by status
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const goalId = searchParams.get("goalId");

    const where: any = { userId };
    if (status) {
      where.status = status;
    }
    if (goalId) {
      where.goalId = goalId;
    }

    const plans = await prisma.investmentPlan.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return successResponse(plans, "Investment plans retrieved successfully");
  } catch (error) {
    return handleApiError(error, "GET /api/investment-plans");
  }
}

/**
 * POST /api/investment-plans
 * Create a new investment plan
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await validateBody(request);

    // Convert/normalize incoming fields (dates may come as ISO strings)
    const normalized = {
      ...body,
      monthlyContribution: body.monthlyContribution !== undefined ? Number(body.monthlyContribution) : undefined,
      expectedReturnMin: body.expectedReturnMin !== undefined ? Number(body.expectedReturnMin) : undefined,
      expectedReturnMax: body.expectedReturnMax !== undefined ? Number(body.expectedReturnMax) : undefined,
      annualIncreasePercent: body.annualIncreasePercent !== undefined ? Number(body.annualIncreasePercent) : undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    };

    // Validate request body
    const validatedData = InvestmentPlanSchema.parse(normalized as any);

    // Create investment plan
    const goalId = body.goalId || null;
    const plan = await prisma.investmentPlan.create({
      data: {
        userId,
        goalId,
        name: validatedData.name,
        monthlyContribution: validatedData.monthlyContribution,
        expectedReturnMin: validatedData.expectedReturnMin,
        expectedReturnMax: validatedData.expectedReturnMax,
        compoundingFrequency: validatedData.compoundingFrequency,
        annualIncreasePercent: validatedData.annualIncreasePercent,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate || null,
        status: validatedData.status || "active",
      },
    });

    return successResponse(plan, "Investment plan created successfully", 201);
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "POST /api/investment-plans");
  }
}

/**
 * PUT /api/investment-plans/:id
 * Update an investment plan
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
    const existingPlan = await prisma.investmentPlan.findUnique({ where: { id } });
    if (!existingPlan || existingPlan.userId !== userId) {
      return errorResponse("Plan not found or unauthorized", 404);
    }

    const body = await validateBody(request);

    const normalized = {
      ...body,
      monthlyContribution: body.monthlyContribution !== undefined ? Number(body.monthlyContribution) : undefined,
      expectedReturnMin: body.expectedReturnMin !== undefined ? Number(body.expectedReturnMin) : undefined,
      expectedReturnMax: body.expectedReturnMax !== undefined ? Number(body.expectedReturnMax) : undefined,
      annualIncreasePercent: body.annualIncreasePercent !== undefined ? Number(body.annualIncreasePercent) : undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    };

    // Validate request body
    const validatedData = InvestmentPlanUpdateSchema.parse(normalized as any);

    // Update investment plan
    const plan = await prisma.investmentPlan.update({
      where: { id },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.monthlyContribution !== undefined && { monthlyContribution: validatedData.monthlyContribution }),
        ...(validatedData.expectedReturnMin !== undefined && { expectedReturnMin: validatedData.expectedReturnMin }),
        ...(validatedData.expectedReturnMax !== undefined && { expectedReturnMax: validatedData.expectedReturnMax }),
        ...(validatedData.compoundingFrequency !== undefined && { compoundingFrequency: validatedData.compoundingFrequency }),
        ...(validatedData.annualIncreasePercent !== undefined && { annualIncreasePercent: validatedData.annualIncreasePercent }),
        ...(validatedData.startDate !== undefined && { startDate: validatedData.startDate }),
        ...(validatedData.endDate !== undefined ? { endDate: validatedData.endDate } : {}),
        ...(validatedData.status !== undefined && { status: validatedData.status }),
      },
    });

    return successResponse(plan, "Investment plan updated successfully");
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "PUT /api/investment-plans/:id");
  }
}

/**
 * DELETE /api/investment-plans/:id
 * Delete an investment plan
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
    const existingPlan = await prisma.investmentPlan.findUnique({ where: { id } });
    if (!existingPlan || existingPlan.userId !== userId) {
      return errorResponse("Plan not found or unauthorized", 404);
    }

    // Delete investment plan
    const plan = await prisma.investmentPlan.delete({
      where: { id },
    });

    return successResponse(plan, "Investment plan deleted successfully");
  } catch (error) {
    return handleApiError(error, "DELETE /api/investment-plans/:id");
  }
}
