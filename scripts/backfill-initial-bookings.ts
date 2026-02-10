/**
 * Backfill script: Create missing RegistrationSession (initial booking) records
 *
 * Prior to commit f582462, registrations created via the Stripe payment flow
 * for FULL_SCHEDULE and DROP_IN types did not get a RegistrationSession record.
 * This script finds those registrations and creates the missing initial bookings.
 *
 * Strategy for each registration missing a RegistrationSession:
 *   1. If the registration has a flexible SessionReservation, use its earliest session
 *   2. Otherwise, use the earliest upcoming session for the class
 *   3. If no future session exists, use the most recent past session for the class
 *
 * Usage: npx ts-node scripts/backfill-initial-bookings.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");

async function main() {
  if (isDryRun) {
    console.log("=== DRY RUN MODE - No changes will be made ===\n");
  }

  console.log("Finding registrations missing initial bookings...\n");

  // Find all non-cancelled registrations that have NO RegistrationSession records
  const registrations = await prisma.classRegistration.findMany({
    where: {
      registrationStatus: { not: "CANCELLED" },
      sessions: {
        none: {},
      },
    },
    include: {
      class: {
        select: { id: true, name: true },
      },
      customer: {
        select: { id: true, name: true, email: true },
      },
      // Get any existing flexible reservations
      reservations: {
        where: {
          reservationStatus: { in: ["PENDING", "CHECKED_IN", "ATTENDED"] },
        },
        include: {
          session: {
            select: { id: true, sessionDate: true, startTime: true },
          },
        },
        orderBy: {
          session: { sessionDate: "asc" },
        },
      },
    },
    orderBy: { registeredAt: "asc" },
  });

  console.log(`Found ${registrations.length} registrations without initial bookings.\n`);

  if (registrations.length === 0) {
    console.log("Nothing to backfill!");
    return;
  }

  let created = 0;
  let skipped = 0;
  const errors: { registrationId: number; error: string }[] = [];

  for (const reg of registrations) {
    const customerLabel = reg.customer
      ? `${reg.customer.name} (${reg.customer.email})`
      : reg.guestEmail
        ? `Guest: ${reg.guestName} (${reg.guestEmail})`
        : `Unknown customer`;

    console.log(
      `Registration #${reg.id}: ${reg.class.name} | ${reg.registrationType} | ${customerLabel}`
    );

    let targetSessionId: number | null = null;
    let source: string = "";

    // Strategy 1: Use earliest flexible reservation session
    if (reg.reservations.length > 0) {
      targetSessionId = reg.reservations[0].session.id;
      source = `existing flexible reservation (SessionReservation for session #${targetSessionId})`;
    }

    // Strategy 2: Find the earliest upcoming session for this class
    if (!targetSessionId) {
      const upcomingSession = await prisma.classSession.findFirst({
        where: {
          classId: reg.classId,
          studioId: reg.studioId,
          isCancelled: false,
          sessionDate: { gte: new Date() },
        },
        orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
        select: { id: true, sessionDate: true, startTime: true },
      });

      if (upcomingSession) {
        targetSessionId = upcomingSession.id;
        source = `earliest upcoming session (${upcomingSession.sessionDate.toISOString().split("T")[0]} at ${upcomingSession.startTime})`;
      }
    }

    // Strategy 3: Fall back to most recent past session
    if (!targetSessionId) {
      const pastSession = await prisma.classSession.findFirst({
        where: {
          classId: reg.classId,
          studioId: reg.studioId,
          isCancelled: false,
        },
        orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
        select: { id: true, sessionDate: true, startTime: true },
      });

      if (pastSession) {
        targetSessionId = pastSession.id;
        source = `most recent past session (${pastSession.sessionDate.toISOString().split("T")[0]} at ${pastSession.startTime})`;
      }
    }

    if (!targetSessionId) {
      console.log(`  SKIPPED - No sessions found for class "${reg.class.name}"\n`);
      skipped++;
      continue;
    }

    console.log(`  -> Using ${source}`);

    if (isDryRun) {
      console.log(`  [DRY RUN] Would create RegistrationSession(registrationId=${reg.id}, sessionId=${targetSessionId})\n`);
      created++;
      continue;
    }

    try {
      await prisma.registrationSession.create({
        data: {
          registrationId: reg.id,
          sessionId: targetSessionId,
        },
      });
      console.log(`  CREATED RegistrationSession(registrationId=${reg.id}, sessionId=${targetSessionId})\n`);
      created++;
    } catch (err: any) {
      // Handle unique constraint violations (already exists somehow)
      if (err.code === "P2002") {
        console.log(`  SKIPPED - RegistrationSession already exists\n`);
        skipped++;
      } else {
        console.log(`  ERROR - ${err.message}\n`);
        errors.push({ registrationId: reg.id, error: err.message });
      }
    }
  }

  console.log("=== Summary ===");
  console.log(`Total registrations missing bookings: ${registrations.length}`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach((e) => console.log(`  Registration #${e.registrationId}: ${e.error}`));
  }

  if (isDryRun) {
    console.log("\n=== DRY RUN COMPLETE - Re-run without --dry-run to apply changes ===");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
