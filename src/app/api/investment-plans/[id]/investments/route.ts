import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";

const prisma = getPrismaClient();

/**
 * GET /api/investment-plans/[id]/investments
 * Get all investments for a plan
 */
export async function GET(
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

    // Get all investment transactions for this plan
    const investments = await prisma.investmentTransaction.findMany({
      where: { investmentPlanId: planId },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    });

    // Get transaction details
    const investmentsWithDetails = await Promise.all(
      investments.map(async (inv) => {
        const transaction = await prisma.transaction.findUnique({
          where: { id: inv.transactionId },
        });
        return {
          ...inv,
          transaction,
        };
      })
    );

    // Calculate totals
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const monthlyInvestments = investments.filter((inv) => inv.isMonthlyInvestment);
    const additionalInvestments = investments.filter((inv) => !inv.isMonthlyInvestment);

    return successResponse(
      {
        plan: {
          id: plan.id,
          name: plan.name,
          status: plan.status,
        },
        investments: investmentsWithDetails,
        summary: {
          totalInvested,
          totalTransactions: investments.length,
          monthlyInvestments: monthlyInvestments.length,
          additionalInvestments: additionalInvestments.length,
        },
      },
      "Investments retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error, "GET /api/investment-plans/:id/investments");
  }
}
