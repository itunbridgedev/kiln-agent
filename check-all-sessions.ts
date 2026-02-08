import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    const sessions = await prisma.classSession.findMany({
      where: {
        class: {
          name: "Beginner Wheel Throwing"
        }
      },
      select: {
        sessionDate: true
      },
      orderBy: {
        sessionDate: 'asc'
      },
      take: 20
    });
    
    console.log(`Total sessions: ${sessions.length}`);
    console.log("\nFirst 20 session dates:");
    sessions.forEach(s => {
      const date = new Date(s.sessionDate);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      console.log(`  ${s.sessionDate.toISOString().split('T')[0]} (${dayName})`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
