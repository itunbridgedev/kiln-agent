import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function testMySchedule() {
  // Get Admin user - using customer id 1
  const admin = await prisma.customer.findUnique({
    where: { id: 1 },
  });

  if (!admin) {
    console.log("Admin user not found with id=1");
    await prisma.$disconnect();
    return;
  }

  console.log("Admin user:", admin.id, admin.name, admin.email);

  // Query sessions where admin is instructor or assistant
  const sessions = await prisma.classSession.findMany({
    where: {
      OR: [
        {
          instructors: {
            some: {
              customerId: admin.id,
            },
          },
        },
        {
          assistants: {
            some: {
              customerId: admin.id,
            },
          },
        },
      ],
    },
    include: {
      class: true,
      instructors: { include: { customer: true } },
      assistants: { include: { customer: true } },
    },
    orderBy: {
      sessionDate: "asc",
    },
    take: 5,
  });

  console.log("\nSessions for admin (first 5):");
  sessions.forEach((s) => {
    const isInstructor = s.instructors.some((i) => i.customerId === admin.id);
    console.log(`  Session ${s.id} - ${s.class.name}`);
    console.log(
      `    Date: ${s.sessionDate.toLocaleDateString()} at ${s.startTime}`
    );
    console.log(`    Role: ${isInstructor ? "Instructor" : "Assistant"}`);
  });

  console.log(`\nTotal sessions found: ${sessions.length}`);

  await prisma.$disconnect();
}

testMySchedule().catch(console.error);
