import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client";

const prisma = new PrismaClient();

async function verifyConnection() {
  try {
    console.log("Testing database connection...");

    // Test reading the budget rule we just created
    const budgetRule = await prisma.budgetRule.findFirst();
    if (budgetRule) {
      console.log("✓ Successfully connected to MongoDB and retrieved data:");
      console.log(`  - Budget Rule ID: ${budgetRule.id}`);
      console.log(`  - Needs: ${budgetRule.needsPercent}%`);
      console.log(`  - Wants: ${budgetRule.wantsPercent}%`);
      console.log(`  - Savings: ${budgetRule.savingsPercent}%`);
      console.log("\n✓ Database connection verified successfully!");
    } else {
      console.log("✗ No budget rules found in database");
    }
  } catch (error) {
    console.error("✗ Failed to connect to database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConnection();
