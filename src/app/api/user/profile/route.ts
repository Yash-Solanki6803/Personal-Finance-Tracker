import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest, getAuthenticatedUser } from "@/lib/auth-middleware";

const prisma = getPrismaClient();

/**
 * GET /api/user/profile
 * Get the current logged-in user's profile information
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return successResponse(user, "User profile retrieved successfully");
  } catch (error) {
    console.error("[GET /api/user/profile] Error:", error);
    return handleApiError(error, "GET /api/user/profile");
  }
}
