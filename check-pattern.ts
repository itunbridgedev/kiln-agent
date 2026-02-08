import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    const pattern = await prisma.classSchedulePattern.findFirst({
      where: {
        class: {
          name: "Beginner Wheel Throwing"
        }
      }
    });

    if (pattern) {
      console.log("Pattern details:");
      console.log("  Recurrence Rule:", pattern.recurrenceRule);
      console.log("  Start Date:", pattern.startDate);
      console.log("  End Date:", pattern.endDate);
      console.log("  Start Time:", pattern.startTime);
      console.log("  End Time:", pattern.endTime);
      console.log("  Duration Hours:", pattern.durationHours.toString());
    }
    
    // Check what sessions exist
    const allSessions = await prisma.classSession.findMany({
      where: {
        schedulePatternId: pattern?.id
      },
      select: {
        sessionDate: true,
        startTime: true
      },
      orderBy: {
        sessionDate: 'asc',
        startTime: 'asc'
      },
      take: 10
    });
    
    console.log("\nFirst 10 generated sessions:");
    allSessions.forEach(s => {
      const date = new Date(s.sessionDate);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      console.log(`  ${s.sessionDate.toISOString().split('T')[0]} (${dayName}) at ${s.startTime}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
