const { PrismaClient } = require('@prisma/client');
const term = process.argv[2] || 'platform';
const prisma = new PrismaClient();

(async () => {
  try {
    const users = await prisma.customer.findMany({
      where: { email: { contains: term } },
      include: { roles: { include: { role: true } }, accounts: true },
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
