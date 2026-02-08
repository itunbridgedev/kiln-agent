import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function regenerate() {
  try {
    // Find the pattern for Beginner Wheel Throwing
    const pattern = await prisma.classSchedulePattern.findFirst({
      where: {
        class: {
          name: "Beginner Wheel Throwing"
        }
      }
    });

    if (!pattern) {
      console.log("Pattern not found");
      return;
    }

    console.log("Found pattern:", pattern.id);

    // Delete existing sessions
    const deleted = await prisma.classSession.deleteMany({
      where: {
        schedulePatternId: pattern.id
      }
    });

    console.log(`Deleted ${deleted.count} existing sessions`);

    // Now trigger regeneration via the API or service
    console.log("Sessions deleted. Please regenerate via the admin UI or the service will auto-generate.");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerate();
