/**
 * Script to remove duplicate sessions from the database
 * Keeps only the first occurrence of each unique session (same date, time, pattern)
 *
 * Usage: npx ts-node scripts/remove-duplicate-sessions.ts
 */

import prisma from "../src/prisma";

async function removeDuplicateSessions() {
  console.log("[Remove Duplicates] Starting...");

  try {
    // Find all sessions
    const allSessions = await prisma.classSession.findMany({
      orderBy: [
        { schedulePatternId: "asc" },
        { sessionDate: "asc" },
        { startTime: "asc" },
        { id: "asc" },
      ],
    });

    console.log(
      `[Remove Duplicates] Found ${allSessions.length} total sessions`
    );

    const seen = new Set<string>();
    const duplicateIds: number[] = [];

    for (const session of allSessions) {
      // Create a unique key for each session
      const key = `${session.schedulePatternId}-${session.sessionDate.toISOString()}-${session.startTime}`;

      if (seen.has(key)) {
        // This is a duplicate
        duplicateIds.push(session.id);
        console.log(
          `[Remove Duplicates] Duplicate found: Session ${session.id} (Pattern ${session.schedulePatternId}, Date: ${session.sessionDate}, Time: ${session.startTime})`
        );
      } else {
        seen.add(key);
      }
    }

    console.log(
      `[Remove Duplicates] Found ${duplicateIds.length} duplicate sessions`
    );

    if (duplicateIds.length > 0) {
      // Delete duplicates
      const result = await prisma.classSession.deleteMany({
        where: {
          id: {
            in: duplicateIds,
          },
        },
      });

      console.log(
        `[Remove Duplicates] Deleted ${result.count} duplicate sessions`
      );
    } else {
      console.log("[Remove Duplicates] No duplicates found");
    }

    console.log("[Remove Duplicates] Complete");
  } catch (error) {
    console.error("[Remove Duplicates] Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  removeDuplicateSessions()
    .then(() => {
      console.log("Done");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed:", error);
      process.exit(1);
    });
}

export default removeDuplicateSessions;
