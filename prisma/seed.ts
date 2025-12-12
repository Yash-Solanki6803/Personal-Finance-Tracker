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
        needsPercent: 50.0,
        wantsPercent: 30.0,
        savingsPercent: 20.0,
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

  console.log(`Seeded ${categories.length} default categories.`);

  // Create a default salary record for the user if not present
  const existingSalary = await prisma.salary.findFirst({ where: { userId: defaultUser.id } });
  if (!existingSalary) {
    const salary = await prisma.salary.create({
      data: {
        userId: defaultUser.id,
        amount: 5000.0,
        lastUpdatedDate: new Date(),
      },
    });
    console.log("Created default salary:", { id: salary.id, amount: salary.amount });
  } else {
    console.log("Salary already exists for default user");
  }

  // Create a default goal for the user
  let defaultGoal = await prisma.goal.findFirst({ where: { userId: defaultUser.id, name: "Emergency Fund" } });
  if (!defaultGoal) {
    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() + 1);
    defaultGoal = await prisma.goal.create({
      data: {
        userId: defaultUser.id,
        name: "Emergency Fund",
        targetAmount: 5000.0,
        targetDate,
        description: "Build a 3-6 month emergency fund",
        status: "on_track",
      },
    });
    console.log("Created default goal:", { id: defaultGoal.id, name: defaultGoal.name });
  } else {
    console.log("Default goal already exists:", { id: defaultGoal.id, name: defaultGoal.name });
  }

  // Create a simple investment plan linked to the goal (if not exists)
  const existingPlan = await prisma.investmentPlan.findFirst({ where: { userId: defaultUser.id, name: "Retirement Plan" } });
  if (!existingPlan) {
    const plan = await prisma.investmentPlan.create({
      data: {
        userId: defaultUser.id,
        goalId: defaultGoal.id,
        name: "Retirement Plan",
        monthlyContribution: 200.0,
        expectedReturnMin: 4.0,
        expectedReturnMax: 8.0,
        compoundingFrequency: "monthly",
        annualIncreasePercent: 2.0,
        startDate: new Date(),
        status: "active",
      },
    });
    console.log("Created default investment plan:", { id: plan.id, name: plan.name });
  } else {
    console.log("Investment plan already exists for default user");
  }

  // Create a recurring transaction example (e.g., monthly rent)
  const existingRecurring = await prisma.recurringTransaction.findFirst({ where: { userId: defaultUser.id, frequency: "monthly" } });
  if (!existingRecurring) {
    const transactionData = JSON.stringify({ amount: 1200.0, category: "Rent/Mortgage", type: "expense", description: "Monthly rent" });
    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId: defaultUser.id,
        transactionData,
        frequency: "monthly",
        nextDueDate: new Date(),
        isActive: true,
      },
    });
    console.log("Created default recurring transaction:", { id: recurring.id });
  } else {
    console.log("Recurring transaction already exists for default user");
  }

  console.log("Seed completed successfully!");
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
