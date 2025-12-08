import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";

const prisma = getPrismaClient();

/**
 * GET /api/categories
 * List all categories with optional filtering by type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where = type ? { type } : {};

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return successResponse(
      categories,
      "Categories retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error, "GET /api/categories");
  }
}
