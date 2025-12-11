import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { TransactionType } from "@/lib/enums";

const prisma = getPrismaClient();

/**
 * POST /api/investment-plans/[id]/close
 * Close/mature an investment plan and create a withdrawal transaction
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const planId = params?.id as string;

    // Verify plan exists and belongs to user
    const plan = await prisma.investmentPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.userId !== userId) {
      return errorResponse("Investment plan not found or unauthorized", 404);
    }

    if (plan.status === "archived") {
      return errorResponse("Investment plan is already closed", 400);
    }

    // Calculate total invested amount
    const investments = await prisma.investmentTransaction.findMany({
      where: { investmentPlanId: planId },
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);

    // Parse request body for maturity amount (optional)
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const maturityAmount = body.maturityAmount || totalInvested;
    const description = body.description || `Maturity/Withdrawal from ${plan.name}`;

    // Create withdrawal/maturity transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: maturityAmount,
        category: "Investments",
        type: TransactionType.INCOME,
        date: new Date(),
        description,
        investmentPlanId: planId,
      },
    });

    // Update plan status to archived
    const updatedPlan = await prisma.investmentPlan.update({
      where: { id: planId },
      data: {
        status: "archived",
        endDate: new Date(),
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: "investment_closed",
        details: JSON.stringify({
          planId,
          planName: plan.name,
          totalInvested,
          maturityAmount,
          transactionId: transaction.id,
          returns: maturityAmount - totalInvested,
        }),
      },
    });

    return successResponse(
      {
        plan: updatedPlan,
        transaction,
        summary: {
          totalInvested,
          maturityAmount,
          returns: maturityAmount - totalInvested,
          returnPercent: totalInvested > 0
            ? ((maturityAmount - totalInvested) / totalInvested * 100).toFixed(2)
            : "0.00",
        },
      },
      "Investment plan closed successfully"
    );
  } catch (error) {
    return handleApiError(error, "POST /api/investment-plans/:id/close");
  }
}
