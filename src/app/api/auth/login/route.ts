import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
} from "@/lib/api-utils";
import {
  verifyMasterPassword,
  generateToken,
  setAuthCookie,
} from "@/lib/auth";

const prisma = getPrismaClient();

/**
 * POST /api/auth/login
 * Verify master password and create authentication session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await validateBody(request);
    const { password, username } = body;

    if (!password || !username) {
      return errorResponse("Username and password are required", 400);
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return errorResponse("Invalid username or password", 401);
    }

    // Verify password against stored hash
    const isValid = await verifyMasterPassword(password, user.password);
    if (!isValid) {
      return errorResponse("Invalid username or password", 401);
    }

    // Generate JWT token with userId
    const token = generateToken({
      authenticated: true,
      userId: user.id,
      username: user.username,
      timestamp: Date.now(),
    });

    // Set auth cookie
    await setAuthCookie(token);

    return successResponse(
      { token, userId: user.id, username: user.username },
      "Login successful",
      200
    );
  } catch (error) {
    console.error("[POST /api/auth/login] Error:", error);
    return errorResponse("Authentication failed", 500);
  }
}
