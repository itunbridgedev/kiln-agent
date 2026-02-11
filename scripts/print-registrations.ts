import prisma from "../src/prisma";

async function main() {
  const regs = await prisma.classRegistration.findMany({
    orderBy: { id: "desc" },
    take: 20,
  });

  console.log("Recent registrations:");
  regs.forEach((r) => {
    console.log(`ID: ${r.id} | guestEmail: ${r.guestEmail} | customerId: ${r.customerId} | classId: ${r.classId}`);
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
