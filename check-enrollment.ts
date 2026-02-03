import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkEnrollment() {
  console.log("Checking Admin User's registrations...\n");

  const regs = await prisma.classRegistration.findMany({
    where: { customerId: 1 },
    include: {
      class: { select: { name: true } },
      sessions: { include: { session: true } },
    },
  });

  console.log("Admin User registrations:", regs.length);
  for (const r of regs) {
    console.log("- Class:", r.class.name);
    console.log("  ID:", r.id);
    console.log("  Status:", r.registrationStatus);
    console.log("  Guest count:", r.guestCount);

    const sessionIds = r.sessions.map((s: any) => s.sessionId);
    console.log("  Session IDs:", sessionIds.join(", ") || "None");

    if (sessionIds.length > 0) {
      const actualSessions = await prisma.classSession.findMany({
        where: { id: { in: sessionIds } },
        select: { id: true, sessionDate: true },
      });
      console.log(
        "  Session Dates:",
        actualSessions
          .map(
            (s) => `${s.id} (${new Date(s.sessionDate).toLocaleDateString()})`
          )
          .join(", ")
      );
    }
  }

  await prisma.$disconnect();
}

checkEnrollment().catch(console.error);
