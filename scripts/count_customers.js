const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.customer.count();
    console.log(count);
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
