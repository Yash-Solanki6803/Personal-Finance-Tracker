import { NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/api-utils";
import { successResponse, errorResponse } from "@/lib/api-utils";

const prisma = getPrismaClient();

/**
 * DELETE /api/admin/categories/:id
 * Delete a category (admin only)
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // TODO: Add admin check
    const params = await context.params;
    const id = params.id;
    if (!id) return errorResponse("Missing category id", 400);
    await prisma.category.delete({ where: { id } });
    return successResponse({}, "Category deleted successfully");
  } catch (error) {
    return errorResponse("Failed to delete category", 400, error);
  }
}
