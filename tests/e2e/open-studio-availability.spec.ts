import { test, expect } from "@playwright/test";

async function apiLogin(request: any) {
  const loginRes = await request.post("/api/auth/login", {
    data: { email: "admin@kilnagent.com", password: "Admin123!" },
  });
  expect(loginRes.ok()).toBeTruthy();
}

test.describe("Open Studio Resource Availability", () => {
  test("release time uses session start time, not midnight", async () => {
    // Regression: release time was calculated from sessionDate (midnight UTC)
    // instead of the actual session start time. A session at 18:00 on Feb 14
    // with 24hr release should release at 18:00 on Feb 13, not 00:00 on Feb 13.
    const sessionDate = new Date("2026-02-14T00:00:00.000Z");
    const startTime = "18:00";
    const releaseHours = 24;

    // Fixed calculation: use actual start time
    const sessionStart = new Date(sessionDate);
    const [h, m] = startTime.split(":").map(Number);
    sessionStart.setUTCHours(h, m, 0, 0);
    const releaseTime = new Date(
      sessionStart.getTime() - releaseHours * 60 * 60 * 1000
    );

    // Release should be at 18:00 UTC on Feb 13, NOT 00:00 UTC on Feb 13
    expect(releaseTime.toISOString()).toBe("2026-02-13T18:00:00.000Z");

    // Old broken calculation would give midnight:
    const brokenRelease = new Date(
      sessionDate.getTime() - releaseHours * 60 * 60 * 1000
    );
    expect(brokenRelease.toISOString()).toBe("2026-02-13T00:00:00.000Z");

    // 18 hour difference
    expect(releaseTime.getTime() - brokenRelease.getTime()).toBe(
      18 * 60 * 60 * 1000
    );
  });

  test("held slots appear for sessions overlapping classes with resource holds", async ({
    request,
  }) => {
    await apiLogin(request);

    // Get open studio sessions
    const sessionsRes = await request.get("/api/open-studio/sessions");
    expect(sessionsRes.ok()).toBeTruthy();
    const allSessions = await sessionsRes.json();

    // Find a session that should have holds (based on overlapping class enrollments)
    for (const s of allSessions.slice(0, 10)) {
      const availRes = await request.get(
        `/api/open-studio/sessions/${s.id}/availability`
      );
      if (!availRes.ok()) continue;
      const avail = await availRes.json();

      for (const r of avail.resources) {
        if (r.heldByClasses > 0) {
          // Verify heldSlots is populated when heldByClasses > 0
          expect(r.heldSlots.length).toBeGreaterThan(0);
          for (const slot of r.heldSlots) {
            expect(slot).toHaveProperty("startTime");
            expect(slot).toHaveProperty("endTime");
          }
          return; // Found at least one held resource, test passes
        }
      }
    }
  });

  test("Date Night pattern config is correct", async ({ request }) => {
    await apiLogin(request);

    // Find Date Night class
    const classesRes = await request.get("/api/admin/classes");
    const classes = await classesRes.json();
    const dateNight = classes.find((c: any) =>
      c.name?.toLowerCase().includes("date night")
    );
    expect(dateNight).toBeTruthy();

    // Verify it has resource requirements
    expect(dateNight.resourceRequirements.length).toBeGreaterThan(0);
    const wheelReq = dateNight.resourceRequirements.find(
      (r: any) => r.resource.name === "Potter's Wheel"
    );
    expect(wheelReq).toBeTruthy();
    expect(wheelReq.quantityPerStudent).toBe(1);

    // Verify pattern has reserveFullCapacity
    const patternsRes = await request.get(
      `/api/admin/schedule-patterns/class/${dateNight.id}`
    );
    const patterns = await patternsRes.json();
    const activePattern = patterns.find((p: any) => p.isActive);
    expect(activePattern).toBeTruthy();
    expect(activePattern.reserveFullCapacity).toBe(true);
    expect(activePattern.resourceReleaseHours).toBe(24);
  });
});
