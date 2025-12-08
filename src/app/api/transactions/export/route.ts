import { NextRequest } from "next/server";
import { getPrismaClient, handleApiError, errorResponse } from "@/lib/api-utils";
import { getUserIdFromRequest } from "@/lib/auth-middleware";

const prisma = getPrismaClient();

function toCSV(rows: any[]) {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.join(",") + "\n";
  const body = rows.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(",")).join("\n");
  return header + body;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const categories = searchParams.get('categories')?.split(',').filter(c => c.trim());

    const where: any = { userId };
    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate) {
      if (where.date) where.date.lte = new Date(endDate);
      else where.date = { lte: new Date(endDate) };
    }
    if (categories && categories.length > 0) where.category = { in: categories };

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 10000,
    });

    if (format === 'json') {
      return new Response(JSON.stringify(transactions), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (format === 'xml') {
      const items = transactions.map(t => `<transaction><id>${t.id}</id><amount>${t.amount}</amount><category>${t.category}</category><type>${t.type}</type><date>${new Date(t.date).toISOString()}</date><description>${(t.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</description></transaction>`).join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?><transactions>${items}</transactions>`;
      return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    const rows = transactions.map(t => ({ id: t.id, amount: t.amount, category: t.category, type: t.type, date: new Date(t.date).toISOString(), description: t.description || '' }));
    const csv = toCSV(rows);
    return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=transactions.csv' } });
  } catch (error) {
    return handleApiError(error, 'GET /api/transactions/export');
  }
}
