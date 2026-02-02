import prisma from "../src/prisma";

/**
 * Script to regenerate Master Potter Certification sessions
 * Run with: npx ts-node scripts/regenerate-master-potter-sessions.ts
 */

async function regenerateMasterPotterSessions() {
  console.log("Finding Master Potter Certification patterns...");

  // Find all patterns for the Master Potter Certification class
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
      },
    },
  });

  if (!masterPotterClass) {
    console.log("Master Potter Certification class not found");
    return;
  }

  console.log(
    `Found class: ${masterPotterClass.name} (ID: ${masterPotterClass.id})`
  );
  console.log(
    `Found ${masterPotterClass.schedulePatterns.length} active patterns`
  );

  for (const pattern of masterPotterClass.schedulePatterns) {
    console.log(`\nProcessing pattern ${pattern.id}:`);
    console.log(`  Recurrence: ${pattern.recurrenceRule}`);
    console.log(`  Start Date: ${pattern.startDate}`);

    // Count existing sessions
    const sessionCount = await prisma.classSession.count({
      where: { schedulePatternId: pattern.id },
    });

    console.log(`  Existing sessions: ${sessionCount}`);

    if (sessionCount > 0) {
      console.log(`  Deleting existing sessions...`);

      // Delete related records first
      await prisma.classSessionInstructor.deleteMany({
        where: {
          session: {
            schedulePatternId: pattern.id,
          },
        },
      });

      await prisma.classSessionAssistant.deleteMany({
        where: {
          session: {
            schedulePatternId: pattern.id,
          },
        },
      });

      // Delete sessions
      const deleted = await prisma.classSession.deleteMany({
        where: { schedulePatternId: pattern.id },
      });

      console.log(`  Deleted ${deleted.count} sessions`);
    }

    console.log(`  ✓ Pattern ${pattern.id} ready for regeneration`);
  }

  console.log("\n✓ All patterns cleaned up!");
  console.log("\nNext steps:");
  console.log("1. Go to the Classes page in the admin panel");
  console.log("2. Edit Master Potter Certification");
  console.log("3. Click 'Generate Sessions' for each pattern");
  console.log("\nOr use the backend API to auto-generate:");
  console.log(
    "For each pattern ID, call: POST /api/admin/schedule-patterns/:id/generate"
  );
}

regenerateMasterPotterSessions()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
