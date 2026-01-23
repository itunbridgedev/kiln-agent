import express from "express";
import { hasRole, isAuthenticated } from "../middleware/auth";
import * as scheduleService from "../services/schedulePatternService";

const router = express.Router();

/**
 * POST /api/admin/schedule-patterns/preview
 * Preview sessions that will be generated from a pattern
 */
router.post(
  "/preview",
  isAuthenticated,
  hasRole(["Admin", "Manager"]),
  async (req, res) => {
    try {
      const { recurrenceRule, startDate, endDate, startTime, durationHours } =
        req.body;

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
        parseFloat(durationHours)
      );

      res.json({
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
 * POST /api/admin/schedule-patterns
 * Create a new schedule pattern
 */
router.post(
  "/",
  isAuthenticated,
  hasRole(["Admin", "Manager"]),
  async (req, res) => {
    try {
      const {
        classId,
        classStepId,
        recurrenceRule,
        startDate,
        endDate,
        startTime,
        durationHours,
        maxStudents,
        location,
      } = req.body;
      const studioId = req.user!.studioId;

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
        durationHours: parseFloat(durationHours),
        maxStudents: parseInt(maxStudents),
        location,
      });

      res.status(201).json(pattern);
    } catch (error: any) {
      console.error("Error creating schedule pattern:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/admin/schedule-patterns/:id/generate
 * Generate sessions from a pattern
 */
router.post(
  "/:id/generate",
  isAuthenticated,
  hasRole(["Admin", "Manager"]),
  async (req, res) => {
    try {
      const patternId = parseInt(req.params.id);
      const sessions =
        await scheduleService.generateSessionsFromPattern(patternId);

      res.json({
        message: `Generated ${sessions.length} sessions`,
        sessions,
      });
    } catch (error: any) {
      console.error("Error generating sessions:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/admin/schedule-patterns/:id
 * Update a schedule pattern
 */
router.put(
  "/:id",
  isAuthenticated,
  hasRole(["Admin", "Manager"]),
  async (req, res) => {
    try {
      const patternId = parseInt(req.params.id);
      const {
        recurrenceRule,
        startDate,
        endDate,
        startTime,
        durationHours,
        maxStudents,
        location,
      } = req.body;

      const pattern = await scheduleService.updateSchedulePattern(patternId, {
        recurrenceRule,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        startTime,
        durationHours: durationHours ? parseFloat(durationHours) : undefined,
        maxStudents: maxStudents ? parseInt(maxStudents) : undefined,
        location,
      });

      res.json(pattern);
    } catch (error: any) {
      console.error("Error updating schedule pattern:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/admin/schedule-patterns/:id/future-sessions
 * Delete future sessions from a pattern (from a specific date)
 */
router.delete(
  "/:id/future-sessions",
  isAuthenticated,
  hasRole(["Admin", "Manager"]),
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
router.put(
  "/sessions/:id",
  isAuthenticated,
  hasRole(["Admin", "Manager"]),
  async (req, res) => {
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
  }
);

/**
 * POST /api/admin/sessions/:id/cancel
 * Cancel a single session
 */
router.post(
  "/sessions/:id/cancel",
  isAuthenticated,
  hasRole(["Admin", "Manager"]),
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

export default router;
