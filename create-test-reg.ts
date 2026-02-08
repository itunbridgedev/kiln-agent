import {PrismaClient} from '@prisma/client';
const p = new PrismaClient();

async function test() {
  const mugClass = await p.class.findFirst({ where: { name: 'Mug Building Course' } });
  if (!mugClass) { console.log('Class not found'); process.exit(1); }
  
  const customer = await p.customer.findFirst();
  if (!customer) { console.log('No customer'); process.exit(1); }
  
  const reg = await p.classRegistration.create({
    data: {
      customerId: customer.id,
      classId: mugClass.id,
      studioId: 1,
      registrationType: 'SINGLE_SESSION',
      registrationStatus: 'CONFIRMED',
      passType: 'FULL_COURSE',
      amountPaid: mugClass.price,
      paymentStatus: 'COMPLETED',
      validFrom: new Date(),
      validUntil: new Date('2026-12-31')
    }
  });
  console.log('Created registration:', reg.id);
}

test().finally(() => p.$disconnect());
