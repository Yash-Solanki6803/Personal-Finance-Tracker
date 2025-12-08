import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * Verify authentication and extract user info from request
 * This should be called inside each API route handler
 */
export const verifyAuth = (request: NextRequest): { userId: string; user: any } | null => {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  return {
    userId: decoded.userId,
    user: decoded,
  };
};

/**
 * Extract userId from authenticated request
 * This reads directly from cookies instead of headers
 */
export const getUserIdFromRequest = (request: NextRequest): string | null => {
  const auth = verifyAuth(request);
  return auth?.userId || null;
};

/**
 * Extract authenticated user from request
 */
export const getAuthenticatedUser = (request: NextRequest): any | null => {
  const auth = verifyAuth(request);
  return auth?.user || null;
};
