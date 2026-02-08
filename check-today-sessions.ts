import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    const sessions = await prisma.classSession.findMany({
      where: {
        class: {
          name: "Beginner Wheel Throwing"
        },
        sessionDate: new Date("2026-02-07T00:00:00Z")
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log(`Found ${sessions.length} sessions for Feb 7, 2026:`);
    sessions.forEach(s => {
      console.log(`  - ${s.startTime} to ${s.endTime}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
