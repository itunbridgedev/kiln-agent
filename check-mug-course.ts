import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const mugClass = await prisma.class.findFirst({
    where: { name: { contains: "Mug Building" } },
    include: {
      steps: {
        orderBy: { stepNumber: "asc" },
      },
      schedulePatterns: {
        include: {
          classStep: true,
        },
        orderBy: { id: "asc" },
      },
      sessions: {
        where: {
          sessionDate: {
            gte: new Date("2026-02-01"),
            lte: new Date("2026-03-31"),
          },
        },
        include: {
          classStep: true,
        },
        orderBy: { sessionDate: "asc" },
        take: 30,
      },
    },
  });

  if (!mugClass) {
    console.log("Mug Building Course not found");
    return;
  }

  console.log("Class:", mugClass.name);
  console.log("Class Type:", mugClass.classType);
  console.log("Requires Sequence:", mugClass.requiresSequence);
  console.log("\nSteps:");
  mugClass.steps.forEach((step) => {
    console.log(`  ${step.stepNumber}. ${step.name}`);
  });

  console.log("\nSchedule Patterns:");
  mugClass.schedulePatterns.forEach((pattern) => {
    console.log(`  Pattern ${pattern.id}:`);
    console.log(`    Step: ${pattern.classStep?.name || "N/A"}`);
    console.log(`    Rule: ${pattern.recurrenceRule}`);
    console.log(`    Start: ${pattern.startDate.toISOString().split("T")[0]}`);
    console.log(`    Time: ${pattern.startTime}`);
  });

  console.log("\nSessions (Feb-Mar 2026):");
  mugClass.sessions.forEach((session) => {
    console.log(
      `  ${session.sessionDate.toISOString().split("T")[0]} ${session.startTime} - ${session.classStep?.name || "No step"}`
    );
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
