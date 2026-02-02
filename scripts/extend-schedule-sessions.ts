/**
 * Script to automatically extend sessions for active schedule patterns
 * This should be run daily via cron to ensure future sessions are always available
 *
 * Usage: npx ts-node scripts/extend-schedule-sessions.ts
 */

import prisma from "../src/prisma";
import { generateSessionsFromPattern } from "../src/services/schedulePatternService";

const FUTURE_MONTHS = 6; // Keep 6 months of future sessions

async function extendScheduleSessions() {
  console.log("[Extend Sessions] Starting session extension check...");

  try {
    // Find all active patterns
    const activePatterns = await prisma.classSchedulePattern.findMany({
      where: {
        isActive: true,
      },
      include: {
        class: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(
      `[Extend Sessions] Found ${activePatterns.length} active patterns`
    );

    const today = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + FUTURE_MONTHS);

    for (const pattern of activePatterns) {
      console.log(
        `[Extend Sessions] Checking pattern ${pattern.id} (${pattern.class.name})`
      );

      // Check if pattern has an end date and if it's passed
      if (pattern.endDate && pattern.endDate < today) {
        console.log(`  Pattern ended on ${pattern.endDate}, skipping`);
        continue;
      }

      // Find the latest session for this pattern
      const latestSession = await prisma.classSession.findFirst({
        where: {
          schedulePatternId: pattern.id,
        },
        orderBy: {
          sessionDate: "desc",
        },
      });

      if (!latestSession) {
        console.log(`  No sessions found, generating initial sessions`);
        await generateSessionsFromPattern(pattern.id);
        continue;
      }

      // If the latest session is less than 3 months in the future, generate more
      const threeMonthsOut = new Date();
      threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);

      if (latestSession.sessionDate < threeMonthsOut) {
        console.log(
          `  Latest session is ${latestSession.sessionDate}, extending...`
        );

        // Update the pattern's endDate temporarily to generate more sessions
        const originalEndDate = pattern.endDate;
        await prisma.classSchedulePattern.update({
          where: { id: pattern.id },
          data: {
            endDate:
              pattern.endDate && pattern.endDate < futureDate
                ? pattern.endDate
                : futureDate,
          },
        });

        // Delete old sessions from the pattern (older than today)
        const deletedResult = await prisma.classSession.deleteMany({
          where: {
            schedulePatternId: pattern.id,
            sessionDate: {
              lt: today,
            },
          },
        });

        if (deletedResult.count > 0) {
          console.log(`  Deleted ${deletedResult.count} past sessions`);
        }

        // Generate new sessions
        await generateSessionsFromPattern(pattern.id);

        // Restore original end date
        await prisma.classSchedulePattern.update({
          where: { id: pattern.id },
          data: { endDate: originalEndDate },
        });

        console.log(`  Extended sessions for pattern ${pattern.id}`);
      } else {
        console.log(
          `  Latest session is ${latestSession.sessionDate}, no extension needed`
        );
      }
    }

    console.log("[Extend Sessions] Session extension complete");
  } catch (error) {
    console.error("[Extend Sessions] Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  extendScheduleSessions()
    .then(() => {
      console.log("Done");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed:", error);
      process.exit(1);
    });
}

export default extendScheduleSessions;
