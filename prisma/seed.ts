import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // Create a default user for seeding
  // Default password: "password" (you should change this!)
  const defaultPassword = await bcrypt.hash("password", 10);

  let defaultUser = await prisma.user.findUnique({
    where: { username: "default_user" },
  });

  if (!defaultUser) {
    defaultUser = await prisma.user.create({
      data: {
        username: "default_user",
        password: defaultPassword,
      },
    });
    console.log("Created default user (username: default_user, password: password):", { id: defaultUser.id, username: defaultUser.username });
  } else {
    console.log("Default user already exists:", { id: defaultUser.id, username: defaultUser.username });
  }

  // Check if budget rule already exists for this user
  const existingBudgetRule = await prisma.budgetRule.findFirst({
    where: { userId: defaultUser.id },
  });

  if (!existingBudgetRule) {
    // Create default budget rule (50-30-20 rule) for default user
    const budgetRule = await prisma.budgetRule.create({
      data: {
        userId: defaultUser.id,
        needsPercent: 50,
        wantsPercent: 30,
        savingsPercent: 20,
      },
    });
    console.log("Created default budget rule:", budgetRule);
  } else {
    console.log("Budget rule already exists for default user");
  }

  // Create default categories using upsert to avoid duplicates
  const categories = [
    // Needs (50%)
    { name: "Groceries", type: "expense" },
    { name: "Rent/Mortgage", type: "expense" },
    { name: "Utilities", type: "expense" },
    { name: "Transportation", type: "expense" },
    { name: "Insurance", type: "expense" },
    { name: "Healthcare", type: "expense" },

    // Wants (30%)
    { name: "Entertainment", type: "expense" },
    { name: "Dining Out", type: "expense" },
    { name: "Shopping", type: "expense" },
    { name: "Hobbies", type: "expense" },
    { name: "Subscriptions", type: "expense" },
    { name: "Travel", type: "expense" },

    // Savings & Investments (20%)
    { name: "Savings", type: "savings" },
    { name: "Investments", type: "investment" },
    { name: "Emergency Fund", type: "savings" },

    // Income
    { name: "Salary", type: "income" },
    { name: "Bonus", type: "income" },
    { name: "Freelance", type: "income" },
    { name: "Investment Returns", type: "income" },
  ];

  // Seed default categories into the database using upsert
  for (const categoryData of categories) {
    await prisma.category.upsert({
      where: { name: categoryData.name },
      update: {},
      create: categoryData,
    });
  }

  console.log(`Seeded ${categories.length} default categories. Seed completed successfully!`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
