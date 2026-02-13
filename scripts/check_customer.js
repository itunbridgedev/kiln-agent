const { PrismaClient } = require('@prisma/client');
const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/check_customer.js email');
  process.exit(1);
}

const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.customer.findFirst({
      where: { email },
      include: { roles: { include: { role: true } }, accounts: true },
    });
    console.log(JSON.stringify(user, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
