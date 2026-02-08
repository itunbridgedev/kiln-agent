import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testResourceAllocation() {
  console.log('\n=== Testing Resource Allocation ===\n');

  // 1. Check existing registrations for Mug Building Course (classId: 5)
  console.log('1. Checking existing Mug Building Course registrations...');
  const registrations = await prisma.classRegistration.findMany({
    where: {
      classId: 5,
      registrationStatus: 'CONFIRMED'
    },
    select: {
      id: true,
      customerId: true,
      guestCount: true,
      createdAt: true
    }
  });
  console.log(`Found ${registrations.length} registrations:`, registrations);

  // 2. Check existing reservations
  console.log('\n2. Checking existing reservations...');
  const reservations = await prisma.sessionReservation.findMany({
    where: {
      registration: {
        classId: 5
      },
      reservationStatus: {
        in: ['PENDING', 'CHECKED_IN', 'ATTENDED']
      }
    },
    select: {
      id: true,
      registrationId: true,
      sessionId: true,
      reservationStatus: true,
      session: {
        select: {
          sessionDate: true,
          startTime: true,
          endTime: true
        }
      }
    }
  });
  console.log(`Found ${reservations.length} active reservations:`, reservations);

  // 3. Check resource allocations
  console.log('\n3. Checking resource allocations...');
  const allocations = await prisma.sessionResourceAllocation.findMany({
    where: {
      registration: {
        classId: 5
      }
    },
    select: {
      id: true,
      sessionId: true,
      resourceId: true,
      registrationId: true,
      quantity: true,
      resource: {
        select: {
          name: true
        }
      }
    }
  });
  console.log(`Found ${allocations.length} resource allocations:`, allocations);

  // 4. Check Potter's Wheel availability for a specific session
  console.log('\n4. Checking Potter\'s Wheel availability...');
  const pottersWheel = await prisma.studioResource.findFirst({
    where: { name: 'Potter\'s Wheel' },
    select: { id: true, name: true, quantity: true }
  });

  if (pottersWheel) {
    console.log(`Potter's Wheel: ${pottersWheel.quantity} total`);

    // Check allocations for a specific session (first reservation's session)
    if (reservations.length > 0) {
      const sessionId = reservations[0].sessionId;
      const sessionAllocations = allocations.filter(a => 
        a.sessionId === sessionId && a.resourceId === pottersWheel.id
      );
      const totalAllocated = sessionAllocations.reduce((sum, a) => sum + a.quantity, 0);
      console.log(`Session ${sessionId}: ${totalAllocated} allocated, ${pottersWheel.quantity - totalAllocated} available`);
    }
  }

  console.log('\n=== Test Complete ===\n');
}

testResourceAllocation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
