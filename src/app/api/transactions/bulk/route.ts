import { NextRequest } from "next/server";
import { getPrismaClient, successResponse, handleApiError, errorResponse } from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";

const prisma = getPrismaClient();

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const { operation, transactionIds, newCategory } = body;

    if (!operation || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing operation or transactionIds" }),
        { status: 400 }
      );
    }

    // Verify all transactions belong to the user
    const transactions = await prisma.transaction.findMany({
      where: { id: { in: transactionIds } },
    });

    if (transactions.some(t => t.userId !== userId)) {
      return errorResponse("Unauthorized: Some transactions do not belong to you", 403);
    }

    if (operation === 'delete') {
      await prisma.transaction.deleteMany({
        where: { id: { in: transactionIds }, userId },
      });
      return successResponse({ deleted: transactionIds.length }, `${transactionIds.length} transactions deleted`);
    }

    if (operation === 'categorize') {
      if (!newCategory) {
        return new Response(
          JSON.stringify({ success: false, message: "newCategory is required for categorize operation" }),
          { status: 400 }
        );
      }
      const result = await prisma.transaction.updateMany({
        where: { id: { in: transactionIds }, userId },
        data: { category: newCategory },
      });
      return successResponse({ updated: result.count }, `${result.count} transactions updated`);
    }

    return new Response(
      JSON.stringify({ success: false, message: "Invalid operation" }),
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/transactions/bulk');
  }
}
