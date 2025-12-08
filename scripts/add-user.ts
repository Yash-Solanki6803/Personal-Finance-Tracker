import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function addUser() {
  try {
    console.log("\n=== Add New User ===\n");

    const username = await question("Enter username: ");
    if (!username.trim()) {
      console.error("Username cannot be empty");
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (existingUser) {
      console.error(`User '${username}' already exists!`);
      process.exit(1);
    }

    const password = await question("Enter password: ");
    if (!password) {
      console.error("Password cannot be empty");
      process.exit(1);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
      },
    });

    // Create default budget rule for the user
    await prisma.budgetRule.create({
      data: {
        userId: user.id,
        needsPercent: 50,
        wantsPercent: 30,
        savingsPercent: 20,
      },
    });

    console.log(`\n✅ User '${username}' created successfully!`);
    console.log(`User ID: ${user.id}`);
    console.log(`Created with default 50-30-20 budget rule\n`);
  } catch (error) {
    console.error("Error creating user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

addUser();
