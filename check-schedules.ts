import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: { schedules: true },
      },
    },
  });

  console.log("Classes and their schedule counts:");
  for (const cls of classes) {
    console.log(`  ${cls.id}. ${cls.name}: ${cls._count.schedules} schedules`);
  }

  console.log("\nSchedules detail:");
  const schedules = await prisma.classSchedule.findMany({
    select: {
      id: true,
      classId: true,
      startDate: true,
      endDate: true,
      class: { select: { name: true } },
      _count: { select: { sessions: true } },
    },
  });

  for (const schedule of schedules) {
    console.log(
      `  Schedule ${schedule.id}: Class ${schedule.classId} (${schedule.class.name}), ${schedule._count.sessions} sessions`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
