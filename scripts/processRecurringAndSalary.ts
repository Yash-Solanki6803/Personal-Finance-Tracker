import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

/**
 * Process recurring transactions and salary credits for all users
 * Should be run as a scheduled job (e.g. daily)
 */
export async function processRecurringAndSalaryTransactions() {
  // 1. Process recurring transactions
  const recurring = await prisma.recurringTransaction.findMany({ where: { isActive: true } });
  for (const rec of recurring) {
    const today = new Date();
    if (rec.nextDueDate <= today) {
      // Parse transactionData (assume JSON)
      let txData;
      try { txData = JSON.parse(rec.transactionData); } catch { continue; }
      await prisma.transaction.create({
        data: {
          ...txData,
          userId: rec.userId,
          date: today,
          recurringId: rec.id,
        },
      });
      // Update nextDueDate
      const nextDate = new Date(rec.nextDueDate);
      if (rec.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (rec.frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
      else if (rec.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
      else if (rec.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
      await prisma.recurringTransaction.update({ where: { id: rec.id }, data: { nextDueDate: nextDate } });
      // Log event
      await prisma.auditLog.create({
        data: {
          userId: rec.userId,
          eventType: "recurring_processed",
          details: JSON.stringify({ transactionId: rec.id, date: today }),
        },
      });
    }
  }

  // 2. Process salary credits
  const users = await prisma.user.findMany();
  for (const user of users) {
    // Get latest salary
    const salary = await prisma.salary.findFirst({
      where: { userId: user.id },
      orderBy: { lastUpdatedDate: "desc" },
    });
    if (!salary) continue;
    const today = new Date();
    // Credit salary if today matches salary date (day of month)
    if (today.getDate() === salary.lastUpdatedDate.getDate()) {
      // Check if already credited for this month
      const alreadyCredited = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
          type: "income",
          category: "Salary",
          date: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lte: new Date(today.getFullYear(), today.getMonth() + 1, 0),
          },
        },
      });
      if (!alreadyCredited) {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            amount: salary.amount,
            type: "income",
            category: "Salary",
            date: today,
            description: "Automated salary credit",
          },
        });
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            eventType: "salary_credited",
            details: JSON.stringify({ amount: salary.amount, date: today }),
          },
        });
      }
    }
  }
}
