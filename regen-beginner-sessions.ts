import { PrismaClient } from "@prisma/client";
import * as scheduleService from "./src/services/schedulePatternService";

const prisma = new PrismaClient();

async function main() {
  console.log("Finding Beginner Wheel Throwing pattern...");
  
  const pattern = await prisma.classSchedulePattern.findFirst({
    where: {
      class: { name: "Beginner Wheel Throwing" },
      isActive: true,
    },
    include: { class: true },
  });

  if (!pattern) {
    console.log("Pattern not found");
    return;
  }

  console.log("Found pattern:", pattern.id);
  console.log("Recurrence Rule:", pattern.recurrenceRule);
  console.log("Start:", pattern.startDate);
  console.log("End:", pattern.endDate);

  // Count existing sessions
  const existingCount = await prisma.classSession.count({
    where: { schedulePatternId: pattern.id },
  });

  console.log(`\nExisting sessions: ${existingCount}`);

  if (existingCount > 0) {
    console.log("\nDeleting existing sessions...");
    const deleted = await prisma.classSession.deleteMany({
      where: { schedulePatternId: pattern.id },
    });
    console.log(`Deleted ${deleted.count} sessions`);
  }

  console.log("\nRegenerating sessions...");
  const sessions = await scheduleService.generateSessionsFromPattern(pattern.id);
  console.log(`✓ Generated ${sessions.length} sessions`);

  // Show some samples
  const samples = await prisma.classSession.findMany({
    where: { schedulePatternId: pattern.id },
    orderBy: { sessionDate: "asc" },
    take: 10,
  });

  console.log("\nFirst 10 sessions:");
  samples.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.sessionDate.toISOString().split('T')[0]} ${s.startTime}-${s.endTime}`);
  });

  const lastSamples = await prisma.classSession.findMany({
    where: { schedulePatternId: pattern.id },
    orderBy: { sessionDate: "desc" },
    take: 5,
  });

  console.log("\nLast 5 sessions:");
  lastSamples.reverse().forEach((s, i) => {
    console.log(`  ${i + sessions.length - 4}. ${s.sessionDate.toISOString().split('T')[0]} ${s.startTime}-${s.endTime}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
