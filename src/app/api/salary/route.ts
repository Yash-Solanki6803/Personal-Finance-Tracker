import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  validateBody,
  getPrismaClient,
  handleApiError,
} from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { SalarySchema, SalaryUpdateSchema } from "@/lib/schemas";

const prisma = getPrismaClient();

/**
 * GET /api/salary
 * Get current salary
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const salary = await prisma.salary.findFirst({
      where: { userId },
      orderBy: { lastUpdatedDate: "desc" },
    });

    if (!salary) {
      return errorResponse("No salary record found", 404);
    }

    return successResponse(salary, "Salary retrieved successfully");
  } catch (error) {
    return handleApiError(error, "GET /api/salary");
  }
}

/**
 * POST /api/salary
 * Create or update a salary record (upsert by date)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await validateBody(request);

    // Validate request body
    const validatedData = SalarySchema.parse(body);

    const dateToUse = validatedData.lastUpdatedDate instanceof Date
      ? validatedData.lastUpdatedDate
      : new Date(validatedData.lastUpdatedDate);

    // Set time to start of day for date comparison
    const startOfDay = new Date(dateToUse);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateToUse);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if a salary record exists for this date and user
    const existingSalary = await prisma.salary.findFirst({
      where: {
        userId,
        lastUpdatedDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    let salary;

    if (existingSalary) {
      // Update existing record
      salary = await prisma.salary.update({
        where: { id: existingSalary.id },
        data: {
          amount: validatedData.amount,
          lastUpdatedDate: dateToUse,
        },
      });
    } else {
      // Create new record
      salary = await prisma.salary.create({
        data: {
          userId,
          amount: validatedData.amount,
          lastUpdatedDate: dateToUse,
        },
      });
    }

    // Write audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: "salary_updated",
        details: JSON.stringify({ salaryId: salary.id, amount: salary.amount, date: salary.lastUpdatedDate }),
      },
    });
    return successResponse(salary, "Salary updated successfully", 201);
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "POST /api/salary");
  }
}

/**
 * PUT /api/salary/:id
 * Update a salary record
 */
export async function PUT(request: NextRequest, context: any) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const params = await Promise.resolve(context?.params);
    const id = params?.id as string;
    const body = await validateBody(request);

    // Validate request body
    const validatedData = SalaryUpdateSchema.parse(body);

    // Update salary record (verify user owns this salary)
    const existingSalary = await prisma.salary.findUnique({ where: { id } });
    if (!existingSalary || existingSalary.userId !== userId) {
      return errorResponse("Salary not found or unauthorized", 404);
    }

    const salary = await prisma.salary.update({
      where: { id },
      data: validatedData,
    });

    return successResponse(salary, "Salary updated successfully");
  } catch (error) {
    if (error instanceof Error && "errors" in error) {
      return errorResponse("Validation failed", 400, error);
    }
    return handleApiError(error, "PUT /api/salary/:id");
  }
}
