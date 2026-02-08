import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Looking for Feb 7 sessions...\n');
  
  const sessions = await prisma.classSession.findMany({
    where: {
      sessionDate: new Date('2026-02-07T00:00:00.000Z'),
    },
    orderBy: {
      startTime: 'asc'
    }
  });

  console.log(`Found ${sessions.length} sessions on Feb 7:`);
  sessions.forEach(s => {
    console.log(`  ID ${s.id}: ${s.startTime} - ${s.endTime}`);
  });

  if (sessions.length === 0) {
    console.log('\nNo sessions found! Checking date range...');
    const anySessions = await prisma.classSession.findMany({
      where: {
        sessionDate: {
          gte: new Date('2026-02-01T00:00:00.000Z'),
          lte: new Date('2026-02-28T00:00:00.000Z'),
        }
      },
      orderBy: {
        sessionDate: 'asc'
      },
      take: 10
    });
    
    console.log(`\nFirst 10 sessions in February:`);
    anySessions.forEach(s => {
      console.log(`  ${s.sessionDate.toISOString().split('T')[0]}: ${s.startTime} - ${s.endTime}`);
    });
    return;
  }
  
  const session = sessions.find(s => s.startTime === '16:00');
  if (!session) {
    console.log('\n4:00 PM session not found!');
    return;
  }

  const detailedSession = await prisma.classSession.findUnique({
    where: { id: session.id },
    include: {
      _count: {
        select: {
          registrationSessions: true,
          reservations: {
            where: {
              reservationStatus: {
                in: ['PENDING', 'CHECKED_IN', 'ATTENDED']
              }
            }
          }
        }
      },
      reservations: {
        where: {
          reservationStatus: {
            in: ['PENDING', 'CHECKED_IN', 'ATTENDED']
          }
        },
        include: {
          registration: {
            include: {
              customer: {
                select: { name: true, email: true }
              }
            }
          }
        }
      }
    }
  });

  if (!detailedSession) return;

  console.log('\n=== Feb 7, 4:00 PM Session ===');
  console.log('Session ID:', detailedSession.id);
  console.log('Max Students:', detailedSession.maxStudents);
  console.log('Current Enrollment (field):', detailedSession.currentEnrollment);
  console.log('\nCounts:');
  console.log('Registration Sessions:', detailedSession._count.registrationSessions);
  console.log('Active Reservations:', detailedSession._count.reservations);
  console.log('Total (calculated):', detailedSession._count.registrationSessions + detailedSession._count.reservations);
  
  console.log('\nReservation Details:');
  detailedSession.reservations.forEach(res => {
    console.log(`  - ${res.registration.customer?.name || res.registration.guestName} (${res.reservationStatus})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
