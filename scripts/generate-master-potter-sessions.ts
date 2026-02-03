import prisma from "../src/prisma";
import { generateSessionsFromPattern } from "../src/services/schedulePatternService";

/**
 * Script to regenerate sessions for Master Potter Certification patterns
 * This uses the backend service directly
 */

async function generateSessions() {
  console.log("Finding Master Potter Certification patterns...");

  const masterPotterClass = await prisma.class.findFirst({
    where: {
      name: {
        contains: "Master Potter Certification",
      },
    },
    include: {
      schedulePatterns: {
        where: {
          isActive: true,
        },
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!masterPotterClass) {
    console.log("Master Potter Certification class not found");
    return;
  }

  console.log(`Found class: ${masterPotterClass.name}`);
  console.log(
    `Found ${masterPotterClass.schedulePatterns.length} active patterns\n`
  );

  for (const pattern of masterPotterClass.schedulePatterns) {
    console.log(`Pattern ${pattern.id}:`);
    console.log(`  RRULE: ${pattern.recurrenceRule}`);
    console.log(`  Start: ${pattern.startDate.toISOString().split("T")[0]}`);
    console.log(`  Time: ${pattern.startTime}`);

    try {
      const sessions = await generateSessionsFromPattern(pattern.id);
      console.log(`  ✓ Generated ${sessions.length} sessions\n`);
    } catch (error) {
      console.error(`  ✗ Error:`, error);
      console.log();
    }
  }

  console.log("✓ Done!");
}

generateSessions()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
