import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  const sessions = await prisma.classSession.findMany({
    where: { classId: 15 },
    select: {
      id: true,
      sessionDate: true,
      currentEnrollment: true,
      createdAt: true,
    },
    orderBy: { sessionDate: "asc" },
  });

  console.log("Total sessions:", sessions.length);

  // Group by date to find duplicates
  const byDate: Record<string, typeof sessions> = {};
  sessions.forEach((s) => {
    const dateKey = new Date(s.sessionDate).toISOString().split("T")[0];
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(s);
  });

  const toDelete: number[] = [];

  Object.keys(byDate).forEach((date) => {
    if (byDate[date].length > 1) {
      console.log("\nDate:", date, "- Duplicate sessions:");
      byDate[date].forEach((s) => {
        console.log(
          "  Session",
          s.id,
          "- Enrollment:",
          s.currentEnrollment,
          "- Created:",
          s.createdAt.toISOString()
        );
      });

      // Keep the session with enrollments, or the oldest one if none have enrollments
      const sorted = byDate[date].sort((a, b) => {
        if (a.currentEnrollment !== b.currentEnrollment) {
          return b.currentEnrollment - a.currentEnrollment; // Higher enrollment first
        }
        return a.createdAt.getTime() - b.createdAt.getTime(); // Older first
      });

      // Delete all except the first one
      for (let i = 1; i < sorted.length; i++) {
        toDelete.push(sorted[i].id);
      }

      console.log("  -> Keeping session", sorted[0].id, ", deleting others");
    }
  });

  if (toDelete.length > 0) {
    console.log("\nDeleting", toDelete.length, "duplicate sessions...");
    const deleted = await prisma.classSession.deleteMany({
      where: { id: { in: toDelete } },
    });
    console.log("Deleted", deleted.count, "sessions");
  } else {
    console.log("\nNo duplicates to delete");
  }

  await prisma.$disconnect();
}

cleanupDuplicates().catch(console.error);
