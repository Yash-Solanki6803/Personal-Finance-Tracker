import { NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/api-utils";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { CategorySchema } from "@/lib/schemas";

const prisma = getPrismaClient();

/**
 * GET /api/admin/categories
 * List all categories
 */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return successResponse(categories, "Categories retrieved successfully");
  } catch (error) {
    return errorResponse("Failed to fetch categories", 500, error);
  }
}

/**
 * POST /api/admin/categories
 * Create a new category (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin check
    const body = await request.json();
    const validated = CategorySchema.parse(body);
    const category = await prisma.category.create({ data: validated });
    return successResponse(category, "Category created successfully", 201);
  } catch (error) {
    return errorResponse("Failed to create category", 400, error);
  }
}
