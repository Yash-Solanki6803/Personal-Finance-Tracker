import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { InvestmentTransactionSchema } from "@/lib/schemas";
import { TransactionType } from "@/lib/enums";

const prisma = getPrismaClient();

/**
 * POST /api/investment-plans/[id]/invest
 * Manually invest in a plan
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

    if (plan.status !== "active") {
      return errorResponse("Investment plan is not active", 400);
    }

    const body = await validateBody(request);
    const validatedData = InvestmentTransactionSchema.parse(body);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Check if monthly investment already made (unless skipMonthlyCheck is true)
    if (!validatedData.skipMonthlyCheck) {
      const existingMonthlyInvestment = await prisma.investmentTransaction.findFirst({
        where: {
          investmentPlanId: planId,
          month: currentMonth,
          year: currentYear,
          isMonthlyInvestment: true,
        },
      });

      if (existingMonthlyInvestment) {
        return errorResponse(
          "Monthly investment already made for this month. Use skipMonthlyCheck: true to add additional investment.",
          400
        );
      }
    }

    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: validatedData.amount,
        category: "Investments",
        type: TransactionType.INVESTMENT,
        date: now,
        description: `Investment in ${plan.name}`,
        investmentPlanId: planId,
      },
    });

    // Create investment transaction record
    const investmentTransaction = await prisma.investmentTransaction.create({
      data: {
        userId,
        investmentPlanId: planId,
        transactionId: transaction.id,
        month: currentMonth,
        year: currentYear,
        amount: validatedData.amount,
        isMonthlyInvestment: !validatedData.skipMonthlyCheck,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: "investment_made",
        details: JSON.stringify({
          planId,
          planName: plan.name,
          amount: validatedData.amount,
          transactionId: transaction.id,
          isMonthly: !validatedData.skipMonthlyCheck,
        }),
      },
    });

    return successResponse(
      { transaction, investmentTransaction },
      "Investment made successfully",
      201
    );
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "POST /api/investment-plans/:id/invest");
  }
}
