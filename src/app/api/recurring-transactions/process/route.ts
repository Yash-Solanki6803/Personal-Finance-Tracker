import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { getNextDueDate } from "@/lib/utils";

const prisma = getPrismaClient();

/**
 * POST /api/recurring-transactions/process
 * Process due recurring transactions: create Transaction records and update nextDueDate / isActive
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const now = new Date();

    // Find recurring transactions that are active, due, and belong to the user
    const dueRecurring = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true,
        nextDueDate: { lte: now },
      },
    });

    const created: any[] = [];

    for (const rt of dueRecurring) {
      try {
        let txData: any = {};
        try {
          txData = JSON.parse(rt.transactionData);
        } catch (e) {
          // If transactionData is not valid JSON, skip
          continue;
        }

        const txDate = rt.nextDueDate ?? new Date();

        // Build create payload
        const createData: any = {
          userId,
          amount: txData.amount,
          category: txData.category,
          type: txData.type,
          description: txData.description,
          date: txDate,
          recurringId: rt.id,
        };

        // Create transaction
        const transaction = await prisma.transaction.create({ data: createData });
        created.push(transaction);

        // Calculate next due date
        const nextDate = getNextDueDate(rt.nextDueDate, rt.frequency);

        // If frequency is 'once' or nextDate is a far future sentinel, deactivate
        const isOnce = rt.frequency?.toLowerCase() === "once";

        await prisma.recurringTransaction.update({
          where: { id: rt.id },
          data: {
            nextDueDate: isOnce ? rt.nextDueDate : nextDate,
            isActive: isOnce ? false : rt.isActive,
          },
        });
      } catch (e) {
        // continue processing others
        console.error("Failed to process recurring transaction", rt.id, e);
      }
    }

    return successResponse({ createdCount: created.length, created }, "Processed recurring transactions");
  } catch (error) {
    return handleApiError(error, "POST /api/recurring-transactions/process");
  }
}
