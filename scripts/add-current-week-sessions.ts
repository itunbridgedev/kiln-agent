import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding sessions for current week...\n");

  const studio = await prisma.studio.findUnique({
    where: { subdomain: "demo" },
  });

  if (!studio) throw new Error("Demo studio not found");

  const staffUser = await prisma.customer.findFirst({
    where: { studioId: studio.id, email: "staff@kilnagent.com" },
  });

  const adminUser = await prisma.customer.findFirst({
    where: { studioId: studio.id, email: "admin@kilnagent.com" },
  });

  if (!staffUser || !adminUser) throw new Error("Users not found");

  const wheelClass = await prisma.class.findFirst({
    where: { studioId: studio.id, name: "Beginner Wheel Throwing" },
  });

  if (!wheelClass) throw new Error("Class not found");

  const teachingRole = await prisma.teachingRole.findFirst({
    where: { studioId: studio.id },
  });

  // Create sessions for this week
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Today at 2 PM
  const todaySession = new Date(today);
  todaySession.setHours(14, 0, 0, 0);

  // Tomorrow at 10 AM
  const tomorrowSession = new Date(today);
  tomorrowSession.setDate(today.getDate() + 1);
  tomorrowSession.setHours(10, 0, 0, 0);

  // This Friday at 4:30 PM
  const friday = new Date(today);
  const daysUntilFriday = (5 - today.getDay() + 7) % 7;
  friday.setDate(today.getDate() + daysUntilFriday);
  friday.setHours(16, 30, 0, 0);

  const sessions = [
    {
      date: todaySession,
      start: "14:00",
      end: "16:00",
      topic: "Today's Demo - Hand Building Basics",
      instructor: staffUser,
      assistant: adminUser,
    },
    {
      date: tomorrowSession,
      start: "10:00",
      end: "12:00",
      topic: "Tomorrow's Workshop - Glazing Techniques",
      instructor: adminUser,
      assistant: staffUser,
    },
    {
      date: friday,
      start: "16:30",
      end: "18:30",
      topic: "Friday Session - Throwing Practice",
      instructor: staffUser,
      assistant: adminUser,
    },
  ];

  for (const sessionData of sessions) {
    const session = await prisma.classSession.create({
      data: {
        studioId: studio.id,
        classId: wheelClass.id,
        sessionDate: sessionData.date,
        startTime: sessionData.start,
        endTime: sessionData.end,
        maxStudents: 10,
        currentEnrollment: Math.floor(Math.random() * 10) + 1,
        location: "Studio B",
        topic: sessionData.topic,
        status: "scheduled",
        instructors: {
          create: {
            customerId: sessionData.instructor.id,
            roleId: teachingRole?.id,
          },
        },
        assistants: {
          create: {
            customerId: sessionData.assistant.id,
            roleId: teachingRole?.id,
          },
        },
      },
    });

    console.log(
      `✓ Created: ${sessionData.date.toLocaleDateString()} ${sessionData.start} - ${sessionData.topic}`
    );
  }

  console.log("\n✅ Added 3 sessions for this week!");
  console.log("Refresh the calendar to see them now.");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
