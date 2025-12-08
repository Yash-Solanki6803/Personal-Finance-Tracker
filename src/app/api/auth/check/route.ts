import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/auth/check
 * Check if user is authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return errorResponse("Not authenticated", 401);
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return errorResponse("Invalid or expired token", 401);
    }

    return successResponse({ authenticated: true }, "User is authenticated");
  } catch (error) {
    console.error("[GET /api/auth/check] Error:", error);
    return errorResponse("Authentication check failed", 500);
  }
}
