import { NextRequest } from "next/server";
import {
  successResponse,
  getPrismaClient,
  handleApiError,
  errorResponse,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";

const prisma = getPrismaClient();

/**
 * GET /api/salary/history
 * Get all salary records ordered by date
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const salaries = await prisma.salary.findMany({
      where: { userId },
      orderBy: { lastUpdatedDate: "desc" },
    });

    return successResponse(salaries, "Salary history retrieved successfully");
  } catch (error) {
    return handleApiError(error, "GET /api/salary/history");
  }
}

