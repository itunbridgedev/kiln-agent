const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const email = 'platform@kilnagent.com';
const password = 'Platform123!';

(async () => {
  try {
    const studio = await prisma.studio.findFirst();
    if (!studio) {
      console.error('No studio found in DB. Aborting.');
      process.exit(1);
    }

    // Ensure roles exist
    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' },
    });
    const userRole = await prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: { name: 'user' },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    const customer = await prisma.customer.upsert({
      where: {
        studioId_email: {
          studioId: studio.id,
          email,
        },
      },
      update: {
        isPlatformAdmin: true,
        passwordHash,
        name: 'Platform Admin',
      },
      create: {
        studioId: studio.id,
        name: 'Platform Admin',
        email,
        passwordHash,
        agreedToTerms: true,
        agreedToSms: false,
        isPlatformAdmin: true,
        roles: {
          create: [
            { role: { connect: { id: adminRole.id } } },
            { role: { connect: { id: userRole.id } } },
          ],
        },
      },
      include: { roles: true },
    });

    // Ensure CustomerRole entries exist (in case of update path)
    const existingRoles = await prisma.customerRole.findMany({ where: { customerId: customer.id } });
    const existingRoleIds = existingRoles.map(r => r.roleId);
    if (!existingRoleIds.includes(adminRole.id)) {
      await prisma.customerRole.create({ data: { customerId: customer.id, roleId: adminRole.id } });
    }
    if (!existingRoleIds.includes(userRole.id)) {
      await prisma.customerRole.create({ data: { customerId: customer.id, roleId: userRole.id } });
    }

    console.log('Platform user upserted:', { id: customer.id, email: customer.email, studioId: customer.studioId });
  } catch (err) {
    console.error('Error creating platform user:', err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
