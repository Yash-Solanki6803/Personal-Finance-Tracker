import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client";

const prisma = new PrismaClient();

async function verifyCategories() {
  try {
    console.log("Verifying categories in database...\n");

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    if (categories.length > 0) {
      console.log(`✓ Found ${categories.length} categories in database:\n`);

      // Group by type
      const grouped = categories.reduce(
        (acc, cat) => {
          if (!acc[cat.type]) acc[cat.type] = [];
          acc[cat.type].push(cat);
          return acc;
        },
        {} as Record<string, typeof categories>
      );

      // Display grouped categories
      for (const [type, cats] of Object.entries(grouped)) {
        console.log(`  ${type.toUpperCase()}:`);
        cats.forEach((cat) => console.log(`    - ${cat.name}`));
        console.log();
      }

      console.log("✓ All categories verified successfully!");
    } else {
      console.log("✗ No categories found in database");
    }
  } catch (error) {
    console.error("✗ Failed to verify categories:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCategories();
