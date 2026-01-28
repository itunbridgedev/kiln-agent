import { PrismaClient } from "@prisma/client";
import { addWeeks, format } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating test sessions with staff assignments...\n");

  // Get the demo studio
  const studio = await prisma.studio.findUnique({
    where: { subdomain: "demo" },
  });

  if (!studio) {
    throw new Error("Demo studio not found");
  }

  // Get staff and admin users
  const staffUser = await prisma.customer.findFirst({
    where: {
      studioId: studio.id,
      email: "staff@kilnagent.com",
    },
  });

  const adminUser = await prisma.customer.findFirst({
    where: {
      studioId: studio.id,
      email: "admin@kilnagent.com",
    },
  });

  if (!staffUser || !adminUser) {
    throw new Error("Staff or admin user not found");
  }

  console.log(`✓ Found staff user: ${staffUser.email}`);
  console.log(`✓ Found admin user: ${adminUser.email}\n`);

  // Get the Beginner Wheel Throwing class
  const wheelClass = await prisma.class.findFirst({
    where: {
      studioId: studio.id,
      name: "Beginner Wheel Throwing",
    },
  });

  if (!wheelClass) {
    throw new Error("Beginner Wheel Throwing class not found");
  }

  console.log(`✓ Found class: ${wheelClass.name}\n`);

  // Get teaching role
  const teachingRole = await prisma.teachingRole.findFirst({
    where: {
      studioId: studio.id,
    },
  });

  // Create 8 weekly sessions starting next Monday
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
  nextMonday.setHours(18, 0, 0, 0); // 6 PM

  console.log("Creating sessions...");

  for (let i = 0; i < 8; i++) {
    const sessionDate = addWeeks(nextMonday, i);

    // Alternate between staff and admin as instructor
    const instructor = i % 2 === 0 ? staffUser : adminUser;
    const assistant = i % 2 === 0 ? adminUser : staffUser;

    const session = await prisma.classSession.create({
      data: {
        studioId: studio.id,
        classId: wheelClass.id,
        sessionNumber: i + 1,
        sessionDate: sessionDate,
        startTime: "18:00",
        endTime: "20:00",
        maxStudents: 12,
        currentEnrollment: Math.floor(Math.random() * 12) + 1, // Random enrollment 1-12
        location: "Studio A",
        topic: `Week ${i + 1} - ${i === 0 ? "Introduction & Centering" : i === 1 ? "Pulling Walls" : i === 2 ? "Shaping" : i === 3 ? "Trimming" : i === 4 ? "Handles" : i === 5 ? "Glazing" : i === 6 ? "Advanced Techniques" : "Final Projects"}`,
        status: "scheduled",
        instructors: {
          create: {
            customerId: instructor.id,
            roleId: teachingRole?.id,
          },
        },
        assistants: {
          create: {
            customerId: assistant.id,
            roleId: teachingRole?.id,
          },
        },
      },
    });

    console.log(
      `  ✓ Session ${i + 1}: ${format(sessionDate, "MMM d, yyyy")} - Instructor: ${instructor.name}, Assistant: ${assistant.name}`
    );
  }

  console.log("\n✅ Created 8 weekly sessions with staff assignments!");
  console.log("\nYou can now:");
  console.log("1. Login as staff@kilnagent.com / Staff123!");
  console.log("2. Click 'My Schedule' button");
  console.log("3. See your assigned sessions in the calendar");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
