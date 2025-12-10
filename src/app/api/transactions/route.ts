import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { TransactionSchema } from "@/lib/schemas";

const prisma = getPrismaClient();

/**
 * GET /api/transactions
 * List all transactions with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build filter conditions
    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Get transactions with pagination
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return successResponse(
      {
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      "Transactions retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error, "GET /api/transactions");
  }
}

/**
 * POST /api/transactions
 * Create a new transaction
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await validateBody(request);

    // Validate request body
    const validatedData = TransactionSchema.parse(body);

    // Create transaction (convert date string to Date object)
    const transaction = await prisma.transaction.create({
      data: {
        ...validatedData,
        userId,
        date: new Date(validatedData.date),
      },
    });

    // Write audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: "transaction_created",
        details: JSON.stringify({ transactionId: transaction.id, amount: transaction.amount, type: transaction.type, date: transaction.date }),
      },
    });

    return successResponse(transaction, "Transaction created successfully", 201);
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      // Zod validation error
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "POST /api/transactions");
  }
}

