import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkRegSessions() {
  const regSessions = await prisma.registrationSession.findMany({
    orderBy: { registrationId: "asc" },
  });

  console.log("Total RegistrationSession records:", regSessions.length);
  regSessions.forEach((rs, i) => {
    console.log(
      `${i + 1}. Reg: ${rs.registrationId} | Session: ${rs.sessionId}`
    );
  });

  console.log("\n Specifically registration 6:");
  const reg6Sessions = regSessions.filter((rs) => rs.registrationId === 6);
  console.log(`  Found ${reg6Sessions.length} session links`);
  reg6Sessions.forEach((rs) => {
    console.log(`    SessionId: ${rs.sessionId}`);
  });

  await prisma.$disconnect();
}

checkRegSessions().catch(console.error);
