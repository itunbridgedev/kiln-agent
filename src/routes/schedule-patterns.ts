import express from "express";
import { isAdmin, isAuthenticated } from "../middleware/auth";
import * as scheduleService from "../services/schedulePatternService";

const router = express.Router();

/**
 * POST /api/admin/schedule-patterns/preview
 * Preview sessions that will be generated from a pattern
 */
router.post("/preview", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const {
      recurrenceRule,
      startDate,
      endDate,
      startTime,
      endTime,
      durationHours,
    } = req.body;

    console.log("Preview endpoint called with:", {
      recurrenceRule,
      startDate,
      endDate,
      startTime,
      endTime,
      durationHours,
    });

    if (!recurrenceRule || !startDate || !startTime || !durationHours) {
      return res.status(400).json({
        error:
          "Missing required fields: recurrenceRule, startDate, startTime, durationHours",
      });
    }

    const sessions = scheduleService.previewSessions(
      recurrenceRule,
      new Date(startDate),
      endDate ? new Date(endDate) : undefined,
      startTime,
      parseFloat(durationHours),
      endTime
    );

    res.json({
      sessions,
      count: sessions.length,
    });
  } catch (error: any) {
    console.error("Error previewing sessions:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/schedule-patterns
 * Create a new schedule pattern
 */
router.post("/", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const {
      classId,
      classStepId,
      recurrenceRule,
      startDate,
      endDate,
      startTime,
      endTime,
      durationHours,
      maxStudents,
      location,
      defaultInstructorId,
      defaultAssistantId,
    } = req.body;
    const studioId = (req as any).studio?.id;

    if (
      !classId ||
      !recurrenceRule ||
      !startDate ||
      !startTime ||
      !durationHours ||
      !maxStudents
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: classId, recurrenceRule, startDate, startTime, durationHours, maxStudents",
      });
    }

    const pattern = await scheduleService.createSchedulePattern({
      classId: parseInt(classId),
      classStepId: classStepId ? parseInt(classStepId) : undefined,
      studioId,
      recurrenceRule,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      startTime,
      endTime: endTime || undefined,
      durationHours: parseFloat(durationHours),
      maxStudents: parseInt(maxStudents),
      location,
      defaultInstructorId: defaultInstructorId
        ? parseInt(defaultInstructorId)
        : undefined,
      defaultAssistantId: defaultAssistantId
        ? parseInt(defaultAssistantId)
        : undefined,
    });

    // Automatically generate sessions for the pattern
    console.log(
      "[Create Pattern] Auto-generating sessions for pattern:",
      pattern.id
    );
    try {
      await scheduleService.generateSessionsFromPattern(pattern.id);
      console.log("[Create Pattern] Sessions generated successfully");
    } catch (genError) {
      console.error("[Create Pattern] Error generating sessions:", genError);
      // Don't fail the pattern creation if session generation fails
    }

    res.status(201).json(pattern);
  } catch (error: any) {
    console.error("Error creating schedule pattern:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/admin/schedule-patterns/:id/preview-sessions
 * Preview sessions that would be generated from a pattern (without creating them)
 */
router.get(
  "/:id/preview-sessions",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const patternId = parseInt(req.params.id);

      const pattern = await scheduleService.getPatternById(patternId);
      if (!pattern) {
        return res.status(404).json({ error: "Pattern not found" });
      }

      const sessions = scheduleService.previewSessions(
        pattern.recurrenceRule,
        pattern.startDate,
        pattern.endDate || undefined,
        pattern.startTime,
        Number(pattern.durationHours),
        pattern.endTime || undefined
      );

      res.json({
        pattern: {
          id: pattern.id,
          className: pattern.class?.name,
          classStepName: pattern.classStep?.name,
          recurrenceRule: pattern.recurrenceRule,
          startDate: pattern.startDate,
          endDate: pattern.endDate,
        },
        sessions,
        count: sessions.length,
      });
    } catch (error: any) {
      console.error("Error previewing sessions:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/admin/schedule-patterns/:id/generate
 * Generate sessions from a pattern
 */
router.post("/:id/generate", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const patternId = parseInt(req.params.id);
    console.log("[Generate Sessions API] Starting for pattern:", patternId);

    const sessions =
      await scheduleService.generateSessionsFromPattern(patternId);

    console.log(
      "[Generate Sessions API] Successfully generated:",
      sessions.length,
      "sessions"
    );
    res.json({
      message: `Generated ${sessions.length} sessions`,
      sessions,
    });
  } catch (error: any) {
    console.error("[Generate Sessions API] Error:", error);
    console.error("[Generate Sessions API] Error stack:", error.stack);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/schedule-patterns/:id
 * Update a schedule pattern
 */
router.put("/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const patternId = parseInt(req.params.id);
    const {
      recurrenceRule,
      startDate,
      endDate,
      startTime,
      endTime,
      durationHours,
      maxStudents,
      location,
      defaultInstructorId,
      defaultAssistantId,
    } = req.body;

    const pattern = await scheduleService.updateSchedulePattern(patternId, {
      recurrenceRule,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate:
        endDate === null ? null : endDate ? new Date(endDate) : undefined,
      startTime,
      endTime: endTime === null ? null : endTime || undefined,
      durationHours: durationHours ? parseFloat(durationHours) : undefined,
      maxStudents: maxStudents ? parseInt(maxStudents) : undefined,
      location,
      defaultInstructorId:
        defaultInstructorId !== undefined
          ? defaultInstructorId
            ? parseInt(defaultInstructorId)
            : null
          : undefined,
      defaultAssistantId:
        defaultAssistantId !== undefined
          ? defaultAssistantId
            ? parseInt(defaultAssistantId)
            : null
          : undefined,
    });

    // Automatically regenerate sessions after updating the pattern
    console.log(
      "[Update Pattern] Auto-regenerating sessions for pattern:",
      pattern.id
    );
    try {
      await scheduleService.regenerateSessionsFromPattern(pattern.id);
      console.log("[Update Pattern] Sessions regenerated successfully");
    } catch (genError) {
      console.error("[Update Pattern] Error regenerating sessions:", genError);
      // Don't fail the pattern update if session regeneration fails
    }

    res.json(pattern);
  } catch (error: any) {
    console.error("Error updating schedule pattern:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/schedule-patterns/:id
 * Delete a schedule pattern and all its associated sessions
 */
router.delete("/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const patternId = parseInt(req.params.id);
    const studioId = (req.user as any).studioId;

    if (!patternId) {
      return res.status(400).json({ error: "Pattern ID is required" });
    }

    await scheduleService.deleteSchedulePattern(patternId, studioId);

    res.json({
      success: true,
      message: "Schedule pattern and associated sessions deleted",
    });
  } catch (error: any) {
    console.error("Error deleting schedule pattern:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/schedule-patterns/:id/future-sessions
 * Delete future sessions from a pattern (from a specific date)
 */
router.delete(
  "/:id/future-sessions",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const patternId = parseInt(req.params.id);
      const { fromDate } = req.body;

      if (!fromDate) {
        return res
          .status(400)
          .json({ error: "Missing required field: fromDate" });
      }

      const result = await scheduleService.deleteFutureSessions(
        patternId,
        new Date(fromDate)
      );

      res.json({
        message: `Deleted ${result.count} future sessions`,
        deletedCount: result.count,
      });
    } catch (error: any) {
      console.error("Error deleting future sessions:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/admin/sessions/:id
 * Update a single session (override pattern)
 */
router.put("/sessions/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const {
      sessionDate,
      startTime,
      endTime,
      maxStudents,
      location,
      notes,
      isCancelled,
    } = req.body;

    const session = await scheduleService.updateSingleSession(sessionId, {
      sessionDate: sessionDate ? new Date(sessionDate) : undefined,
      startTime,
      endTime,
      maxStudents: maxStudents ? parseInt(maxStudents) : undefined,
      location,
      notes,
      isCancelled,
    });

    res.json(session);
  } catch (error: any) {
    console.error("Error updating session:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/sessions/:id/cancel
 * Cancel a single session
 */
router.post(
  "/sessions/:id/cancel",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { notes } = req.body;

      const session = await scheduleService.cancelSession(sessionId, notes);

      res.json({
        message: "Session cancelled successfully",
        session,
      });
    } catch (error: any) {
      console.error("Error cancelling session:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/admin/schedule-patterns/presets
 * Get common pattern presets for UI
 */
router.get("/presets", isAuthenticated, async (req, res) => {
  res.json({
    weeklyOnce: {
      name: "Weekly (Once per week)",
      example: "FREQ=WEEKLY;BYDAY=TU;COUNT=8",
      description: "Class meets once per week on the same day",
    },
    weeklyTwice: {
      name: "Weekly (Twice per week)",
      example: "FREQ=WEEKLY;BYDAY=TU,TH;COUNT=16",
      description: "Class meets twice per week (e.g., Tuesday and Thursday)",
    },
    biWeekly: {
      name: "Bi-Weekly",
      example: "FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;COUNT=6",
      description: "Class meets every other week",
    },
    monthly: {
      name: "Monthly",
      example: "FREQ=MONTHLY;BYMONTHDAY=15;COUNT=6",
      description: "Class meets once per month on a specific day",
    },
  });
});

/**
 * GET /api/admin/schedule-patterns/class/:classId
 * Get all patterns for a specific class
 */
router.get("/class/:classId", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);

    const patterns = await scheduleService.getPatternsByClass(classId);
    res.json(patterns);
  } catch (error: any) {
    console.error("Error fetching patterns:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
