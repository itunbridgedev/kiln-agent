import { PrismaClient } from "@prisma/client";
import { regenerateSessionsFromPattern } from "./src/services/schedulePatternService";

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
    console.log("Force regenerating sessions...");

    await regenerateSessionsFromPattern(pattern.id);
    
    console.log("Sessions regenerated successfully!");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerate();
