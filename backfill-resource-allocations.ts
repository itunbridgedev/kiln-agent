import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillResourceAllocations() {
  console.log('\n=== Backfilling Resource Allocations ===\n');

  // Find all active reservations without resource allocations
  const reservations = await prisma.sessionReservation.findMany({
    where: {
      reservationStatus: {
        in: ['PENDING', 'CHECKED_IN', 'ATTENDED']
      }
    },
    include: {
      registration: {
        select: {
          id: true,
          guestCount: true,
          class: {
            include: {
              resourceRequirements: {
                include: {
                  resource: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log(`Found ${reservations.length} active reservations to backfill`);

  let backfilled = 0;
  let skipped = 0;

  for (const reservation of reservations) {
    // Check if allocations already exist
    const existingAllocation = await prisma.sessionResourceAllocation.findFirst({
      where: {
        registrationId: reservation.registrationId,
        sessionId: reservation.sessionId
      }
    });

    if (existingAllocation) {
      console.log(`  Skipping reservation ${reservation.id} - already has allocations`);
      skipped++;
      continue;
    }

    // Create resource allocations
    if (reservation.registration.class.resourceRequirements.length > 0) {
      console.log(`  Backfilling reservation ${reservation.id} (session ${reservation.sessionId})`);
      
      for (const requirement of reservation.registration.class.resourceRequirements) {
        await prisma.sessionResourceAllocation.create({
          data: {
            sessionId: reservation.sessionId,
            resourceId: requirement.resourceId,
            registrationId: reservation.registrationId,
            quantity: reservation.registration.guestCount * requirement.quantityPerStudent
          }
        });
        console.log(`    - Allocated ${reservation.registration.guestCount * requirement.quantityPerStudent}x ${requirement.resource.name}`);
      }
      backfilled++;
    } else {
      console.log(`  Skipping reservation ${reservation.id} - class has no resource requirements`);
      skipped++;
    }
  }

  console.log(`\n✓ Backfilled ${backfilled} reservations`);
  console.log(`✓ Skipped ${skipped} reservations`);
  console.log('\n=== Backfill Complete ===\n');
}

backfillResourceAllocations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
