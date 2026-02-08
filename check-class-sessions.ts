import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    // Find all classes
    const classes = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            sessions: true
          }
        }
      }
    });
    
    console.log("Classes and their session counts:");
    classes.forEach(c => {
      console.log(`  Class ${c.id}: ${c.name} - ${c._count.sessions} sessions`);
    });
    
    // Check Beginner Wheel Throwing specifically
    const bwtClass = await prisma.class.findFirst({
      where: { name: "Beginner Wheel Throwing" },
      include: {
        schedulePatterns: {
          select: {
            id: true,
            recurrenceRule: true,
            startDate: true,
            _count: {
              select: {
                sessions: true
              }
            }
          }
        }
      }
    });
    
    console.log("\nBeginner Wheel Throwing class:");
    console.log(`  Class ID: ${bwtClass?.id}`);
    console.log(`  Schedule patterns: ${bwtClass?.schedulePatterns.length}`);
    bwtClass?.schedulePatterns.forEach((p, i) => {
      console.log(`    Pattern ${i+1} (ID ${p.id}): ${p._count.sessions} sessions`);
      console.log(`      Rule: ${p.recurrenceRule}`);
      console.log(`      Start: ${p.startDate.toISOString().split('T')[0]}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
