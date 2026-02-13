const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const users = await prisma.customer.findMany({
      take: 50,
      select: { id: true, email: true, name: true, isPlatformAdmin: true, studioId: true },
      orderBy: { id: 'asc' }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
