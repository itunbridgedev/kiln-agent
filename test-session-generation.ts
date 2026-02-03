import prisma from "./src/prisma";
import * as scheduleService from "./src/services/schedulePatternService";

async function testSessionGeneration() {
  console.log("Testing Session Generation...\n");

  // Get first pattern
  const pattern = await prisma.classSchedulePattern.findFirst({
    include: { class: true, classStep: true },
  });

  if (!pattern) {
    console.log("❌ No patterns found. Run seed script first.");
    return;
  }

  console.log("✓ Found pattern:");
  console.log(`  ID: ${pattern.id}`);
  console.log(`  Class: ${pattern.class.name}`);
  if (pattern.classStep) {
    console.log(`  Step: ${pattern.classStep.name}`);
  }
  console.log(`  RRULE: ${pattern.recurrenceRule}`);
  console.log(`  Start Date: ${pattern.startDate.toLocaleDateString()}`);
  console.log(`  Start Time: ${pattern.startTime}`);
  console.log(`  Duration: ${pattern.durationHours} hours`);
  console.log(`  Max Students: ${pattern.maxStudents}`);

  // Check existing sessions
  const existingSessions = await prisma.classSession.findMany({
    where: { schedulePatternId: pattern.id },
  });

  console.log(
    `\n📅 Existing sessions for this pattern: ${existingSessions.length}`
  );

  // Preview sessions
  console.log("\n🔍 Previewing sessions...");
  const preview = scheduleService.previewSessions(
    pattern.recurrenceRule,
    pattern.startDate,
    pattern.endDate || undefined,
    pattern.startTime,
    Number(pattern.durationHours)
  );

  console.log(`  Will generate ${preview.length} sessions:`);
  preview.slice(0, 5).forEach((session) => {
    console.log(
      `    - Session ${session.sessionNumber}: ${session.dayOfWeek}, ${session.sessionDate.toLocaleDateString()} at ${session.startTime}`
    );
  });
  if (preview.length > 5) {
    console.log(`    ... and ${preview.length - 5} more`);
  }

  // Generate sessions if none exist
  if (existingSessions.length === 0) {
    console.log("\n⚙️  Generating sessions...");
    const generatedSessions = await scheduleService.generateSessionsFromPattern(
      pattern.id
    );
    console.log(`✅ Generated ${generatedSessions.length} sessions`);

    // Show first few
    generatedSessions.slice(0, 3).forEach((session) => {
      console.log(
        `  - Session ${session.sessionNumber}: ${session.sessionDate.toLocaleDateString()} ${session.startTime}-${session.endTime}`
      );
    });
  } else {
    console.log(
      "\n⚠️  Sessions already exist for this pattern. Skipping generation."
    );
  }

  await prisma.$disconnect();
  console.log("\n✅ Test complete!");
}

testSessionGeneration().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
