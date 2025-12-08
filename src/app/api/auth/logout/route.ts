import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-utils";
import { clearAuthCookie } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * Clear authentication session
 */
export async function POST(request: NextRequest) {
  try {
    // Clear auth cookie
    await clearAuthCookie();

    return successResponse(null, "Logout successful", 200);
  } catch (error) {
    console.error("[POST /api/auth/logout] Error:", error);
    return successResponse(null, "Logout completed", 200);
  }
}
