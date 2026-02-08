import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    // Check what sessions exist in February
    const febSessions = await prisma.classSession.findMany({
      where: {
        class: {
          name: "Beginner Wheel Throwing"
        },
        sessionDate: {
          gte: new Date("2026-02-01T00:00:00Z"),
          lt: new Date("2026-03-01T00:00:00Z")
        }
      },
      select: {
        sessionDate: true,
        startTime: true,
        endTime: true
      },
      orderBy: [
        { sessionDate: 'asc' },
        { startTime: 'asc' }
      ]
    });
    
    console.log(`Found ${febSessions.length} sessions in February 2026:`);
    
    // Group by date
    const byDate = febSessions.reduce((acc, s) => {
      const dateStr = s.sessionDate.toISOString().split('T')[0];
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(s);
      return acc;
    }, {} as Record<string, typeof febSessions>);
    
    Object.keys(byDate).sort().forEach(dateStr => {
      const date = new Date(dateStr + 'T00:00:00Z');
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      console.log(`\n${dateStr} (${dayName}):`);
      byDate[dateStr].forEach(s => {
        console.log(`  ${s.startTime} - ${s.endTime}`);
      });
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
