import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    // Check sessions for Feb 2-8
    for (let day = 2; day <= 8; day++) {
      const dateStr = `2026-02-${String(day).padStart(2, '0')}`;
      const sessions = await prisma.classSession.findMany({
        where: {
          class: {
            name: "Beginner Wheel Throwing"
          },
          sessionDate: new Date(dateStr + 'T00:00:00Z')
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });
      
      const date = new Date(dateStr + 'T00:00:00Z');
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      
      console.log(`${dateStr} (${dayName}): ${sessions.length} sessions`);
      if (sessions.length > 0) {
        sessions.forEach(s => {
          console.log(`  - ID ${s.id}: ${s.startTime} - ${s.endTime} [${s.status}]`);
        });
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
