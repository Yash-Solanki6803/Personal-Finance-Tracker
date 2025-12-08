import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log("Cleaning database...");

    // Delete all data in order (due to foreign key constraints)
    await prisma.transaction.deleteMany({});
    console.log("✓ Deleted all transactions");

    await prisma.recurringTransaction.deleteMany({});
    console.log("✓ Deleted all recurring transactions");

    await prisma.investmentPlan.deleteMany({});
    console.log("✓ Deleted all investment plans");

    await prisma.budgetRule.deleteMany({});
    console.log("✓ Deleted all budget rules");

    await prisma.salary.deleteMany({});
    console.log("✓ Deleted all salaries");

    await prisma.goal.deleteMany({});
    console.log("✓ Deleted all goals");

    // Categories are global, keep them
    // await prisma.category.deleteMany({});

    await prisma.user.deleteMany({});
    console.log("✓ Deleted all users");

    console.log("\n✅ Database cleaned successfully!");
  } catch (error) {
    console.error("Error cleaning database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
