import { PrismaClient } from "@prisma/client";
import { generateSessionsFromPattern } from "./src/services/schedulePatternService";

const prisma = new PrismaClient();

async function generate() {
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
    console.log("Generating sessions...");

    await generateSessionsFromPattern(pattern.id);
    
    console.log("Sessions generated successfully!");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

generate();
