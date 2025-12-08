import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import {
  RecurringTransactionSchema,
  RecurringTransactionUpdateSchema,
} from "@/lib/schemas";

const prisma = getPrismaClient();

/**
 * GET /api/recurring-transactions
 * List all recurring transactions with optional filtering by active status
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    const where: any = { userId };
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const transactions = await prisma.recurringTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return successResponse(
      transactions,
      "Recurring transactions retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error, "GET /api/recurring-transactions");
  }
}

/**
 * POST /api/recurring-transactions
 * Create a new recurring transaction
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await validateBody(request);

    // Validate request body
    const validatedData = RecurringTransactionSchema.parse(body);

    // Create recurring transaction
    const transaction = await prisma.recurringTransaction.create({
      data: {
        ...validatedData,
        userId,
      },
    });

    return successResponse(
      transaction,
      "Recurring transaction created successfully",
      201
    );
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "POST /api/recurring-transactions");
  }
}

/**
 * PUT /api/recurring-transactions/:id
 * Update a recurring transaction
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
    const existingTransaction = await prisma.recurringTransaction.findUnique({ where: { id } });
    if (!existingTransaction || existingTransaction.userId !== userId) {
      return errorResponse("Transaction not found or unauthorized", 404);
    }

    const body = await validateBody(request);

    // Validate request body
    const validatedData = RecurringTransactionUpdateSchema.parse(body);

    // Update recurring transaction
    const transaction = await prisma.recurringTransaction.update({
      where: { id },
      data: validatedData,
    });

    return successResponse(transaction, "Recurring transaction updated successfully");
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "PUT /api/recurring-transactions/:id");
  }
}

/**
 * DELETE /api/recurring-transactions/:id
 * Delete a recurring transaction
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
    const existingTransaction = await prisma.recurringTransaction.findUnique({ where: { id } });
    if (!existingTransaction || existingTransaction.userId !== userId) {
      return errorResponse("Transaction not found or unauthorized", 404);
    }

    // Delete recurring transaction
    const transaction = await prisma.recurringTransaction.delete({
      where: { id },
    });

    return successResponse(transaction, "Recurring transaction deleted successfully");
  } catch (error) {
    return handleApiError(error, "DELETE /api/recurring-transactions/:id");
  }
}
