import { NextRequest } from "next/server";
import {
  getPrismaClient,
  successResponse,
  errorResponse,
  handleApiError,
  validateBody,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { TransactionUpdateSchema } from "@/lib/schemas";

const prisma = getPrismaClient();

/**
 * GET /api/transactions/:id
 * Get a single transaction by ID
 */
export async function GET(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const id = params?.id as string;
    if (!id) return errorResponse("Missing id", 400);

    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction || transaction.userId !== userId) {
      return errorResponse("Transaction not found", 404);
    }

    return successResponse(transaction, "Transaction retrieved successfully");
  } catch (error) {
    return handleApiError(error, "GET /api/transactions/[id]");
  }
}

/**
 * PUT /api/transactions/:id
 * Update a transaction
 */
export async function PUT(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const id = params?.id as string;
    if (!id) return errorResponse("Missing id", 400);

    // Verify ownership
    const existingTransaction = await prisma.transaction.findUnique({ where: { id } });
    if (!existingTransaction || existingTransaction.userId !== userId) {
      return errorResponse("Transaction not found or unauthorized", 404);
    }

    const body = await validateBody(request);

    // Validate request body
    const validatedData = TransactionUpdateSchema.parse(body);

    // Convert date string to Date if provided
    const updateData: any = { ...validatedData };
    if (validatedData.date) {
      updateData.date = new Date(validatedData.date);
    }

    // Update transaction
    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    });

    return successResponse(transaction, "Transaction updated successfully");
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      // Zod validation error
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "PUT /api/transactions/[id]");
  }
}

/**
 * DELETE /api/transactions/:id
 * Delete a transaction
 */
export async function DELETE(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const id = params?.id as string;
    if (!id) return errorResponse("Missing id", 400);

    // Verify ownership
    const existingTransaction = await prisma.transaction.findUnique({ where: { id } });
    if (!existingTransaction || existingTransaction.userId !== userId) {
      return errorResponse("Transaction not found or unauthorized", 404);
    }

    // Delete transaction
    const transaction = await prisma.transaction.delete({
      where: { id },
    });

    return successResponse(transaction, "Transaction deleted successfully");
  } catch (error) {
    return handleApiError(error, "DELETE /api/transactions/[id]");
  }
}
