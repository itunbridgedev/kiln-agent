import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    const now = new Date();
    console.log("Current time:", now.toISOString());
    console.log("Current date only:", now.toISOString().split('T')[0]);
    
    // Check sessions with gte filter
    const sessionsGte = await prisma.classSession.findMany({
      where: {
        classId: 2,
        sessionDate: {
          gte: now
        }
      },
      select: {
        sessionDate: true,
        startTime: true
      },
      orderBy: {
        sessionDate: 'asc'
      },
      take: 10
    });
    
    console.log(`\nSessions with gte filter (${sessionsGte.length}):`);
    sessionsGte.forEach(s => {
      console.log(`  ${s.sessionDate.toISOString().split('T')[0]} at ${s.startTime}`);
    });
    
    // Check today's sessions specifically
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    console.log(`\nChecking today: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);
    
    const todaySessions = await prisma.classSession.findMany({
      where: {
        classId: 2,
        sessionDate: {
          gte: todayStart,
          lte: todayEnd
        }
      },
      select: {
        sessionDate: true,
        startTime: true
      }
    });
    
    console.log(`Today's sessions (${todaySessions.length}):`);
    todaySessions.forEach(s => {
      console.log(`  ${s.sessionDate.toISOString().split('T')[0]} at ${s.startTime}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
