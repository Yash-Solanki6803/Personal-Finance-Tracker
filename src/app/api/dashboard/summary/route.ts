import { getBankBalance, getNetWorth } from "@/lib/financial-calculations";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-utils";

/**
 * GET /api/dashboard/summary
 * Returns user's bank balance, min/max net worth
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse("Unauthorized", 401);
    const bankBalance = await getBankBalance(userId);
    const { minNetWorth, maxNetWorth } = await getNetWorth(userId);
    return successResponse({ bankBalance, minNetWorth, maxNetWorth }, "Dashboard summary retrieved");
  } catch (error) {
    return errorResponse("Failed to fetch dashboard summary", 500, error);
  }
}
