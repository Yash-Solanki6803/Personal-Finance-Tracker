#!/usr/bin/env node

import bcryptjs from "bcryptjs";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🔐 Finance Tracker - Password Hash Generator");
console.log("=============================================\n");

rl.question(
  "Enter the master password you want to use: ",
  async (password) => {
    if (!password) {
      console.error("❌ Password cannot be empty!");
      rl.close();
      process.exit(1);
    }

    try {
      const hash = await bcryptjs.hash(password, 10);
      console.log("\n✅ Password hash generated successfully!\n");
      console.log("Copy the hash below and add it to your .env file:");
      console.log("-------------------------------------------");
      console.log(`MASTER_PASSWORD_HASH="${hash}"`);
      console.log("-------------------------------------------\n");
    } catch (error) {
      console.error("❌ Error generating hash:", error);
      process.exit(1);
    }

    rl.close();
  }
);
