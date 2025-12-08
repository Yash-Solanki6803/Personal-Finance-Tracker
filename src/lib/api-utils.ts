import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../generated/prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * API response wrapper
 */
export const successResponse = <T>(
  data: T,
  message: string = "Success",
  statusCode: number = 200
) => {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status: statusCode }
  );
};

/**
 * Error response wrapper
 */
export const errorResponse = (
  error: string,
  statusCode: number = 400,
  details?: any
) => {
  return NextResponse.json(
    {
      success: false,
      message: error,
      ...(details && { details }),
    },
    { status: statusCode }
  );
};

/**
 * Validate request body
 */
export const validateBody = async (request: NextRequest): Promise<any> => {
  try {
    return await request.json();
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
};

/**
 * Get Prisma client instance
 */
export const getPrismaClient = () => {
  return prisma;
};

/**
 * Handle API errors with proper logging
 */
export const handleApiError = (error: unknown, context: string) => {
  console.error(`[${context}] Error:`, error);

  if (error instanceof Error) {
    // Prisma validation errors
    if ("code" in error && error.code === "P2002") {
      return errorResponse("Unique constraint violation", 409);
    }

    // Prisma not found errors
    if ("code" in error && error.code === "P2025") {
      return errorResponse("Resource not found", 404);
    }

    // Generic error
    return errorResponse(error.message, 500);
  }

  return errorResponse("An unknown error occurred", 500);
};
