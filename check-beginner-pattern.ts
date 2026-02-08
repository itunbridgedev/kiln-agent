import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const beginnerClass = await prisma.class.findFirst({
    where: { name: "Beginner Wheel Throwing" },
    include: {
      schedulePatterns: {
        include: {
          sessions: {
            orderBy: { sessionDate: "asc" },
            take: 10,
          },
        },
      },
    },
  });

  if (!beginnerClass) {
    console.log("Beginner Wheel Throwing class not found");
    return;
  }

  console.log("Class:", beginnerClass.name);
  console.log("Patterns:", beginnerClass.schedulePatterns.length);
  
  for (const pattern of beginnerClass.schedulePatterns) {
    console.log("\n--- Pattern", pattern.id, "---");
    console.log("Recurrence Rule:", pattern.recurrenceRule);
    console.log("Start Date:", pattern.startDate);
    console.log("End Date:", pattern.endDate);
    console.log("Start Time:", pattern.startTime);
    console.log("End Time:", pattern.endTime);
    console.log("Duration Hours:", pattern.durationHours);
    console.log("Occurrences:", pattern.occurrences);
    console.log("Is Active:", pattern.isActive);
    console.log("Total Sessions:", pattern.sessions.length);
    
    console.log("\nFirst 10 sessions:");
    pattern.sessions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.sessionDate.toISOString().split('T')[0]} ${s.startTime} - ${s.endTime}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
