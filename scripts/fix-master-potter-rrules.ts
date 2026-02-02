import prisma from "../src/prisma";

/**
 * Script to fix BYSETPOS in Master Potter Certification pattern RRULEs
 * Updates patterns to use comma-separated BYSETPOS for multiple days in a week
 */

async function fixMasterPotterRRules() {
  console.log("Finding Master Potter Certification patterns...\n");

  const patterns = await prisma.classSchedulePattern.findMany({
    where: {
      class: {
        name: {
          contains: "Master Potter Certification",
        },
      },
      isActive: true,
    },
    include: {
      class: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  if (patterns.length === 0) {
    console.log("No patterns found");
    return;
  }

  console.log(`Found ${patterns.length} patterns\n`);

  for (const pattern of patterns) {
    console.log(`Pattern ${pattern.id}:`);
    console.log(`  Old RRULE: ${pattern.recurrenceRule}`);

    // Parse the RRULE
    const parts = pattern.recurrenceRule.split(";");
    let freq = "";
    let byday = "";
    let bysetpos = "";
    let count = "";

    for (const part of parts) {
      if (part.startsWith("FREQ=")) freq = part;
      else if (part.startsWith("BYDAY=")) byday = part;
      else if (part.startsWith("BYSETPOS=")) bysetpos = part;
      else if (part.startsWith("COUNT=")) count = part;
    }

    // Extract values
    const days = byday.split("=")[1]?.split(",") || [];
    const weekNum = parseInt(bysetpos.split("=")[1] || "1");

    console.log(`  Days: ${days.join(", ")}`);
    console.log(`  Week: ${weekNum}`);

    // Calculate new BYSETPOS
    // For week 1 with TU,TH: positions 1,2
    // For week 2 with TU,TH: positions 3,4
    // For week 3 with TU,TH: positions 5,6
    // For week 4 with TU,TH: positions 7,8
    const numDays = days.length;
    const startPos = (weekNum - 1) * numDays + 1;
    const positions = Array.from({ length: numDays }, (_, i) => startPos + i);
    const newBySetPos = `BYSETPOS=${positions.join(",")}`;

    // Build new RRULE
    const newRRule = `${freq};${byday};${newBySetPos};${count}`;
    console.log(`  New RRULE: ${newRRule}`);

    // Update the pattern
    await prisma.classSchedulePattern.update({
      where: { id: pattern.id },
      data: { recurrenceRule: newRRule },
    });

    console.log(`  ✓ Updated\n`);
  }

  console.log("✓ All patterns updated!");
  console.log(
    "\nNow run: npx ts-node scripts/generate-master-potter-sessions.ts"
  );
}

fixMasterPotterRRules()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
