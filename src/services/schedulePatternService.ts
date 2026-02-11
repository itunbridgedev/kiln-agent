import { addHours, format } from "date-fns";
import { rrulestr } from "rrule";
import prisma from "../prisma";

export interface SchedulePatternInput {
  classId: number;
  classStepId?: number;
  studioId: number;
  recurrenceRule: string; // RRULE format: "FREQ=WEEKLY;BYDAY=TU;COUNT=8"
  startDate: Date;
  endDate?: Date | null;
  startTime: string; // "HH:MM" format
  endTime?: string | null; // "HH:MM" format - For series schedules, time when last session starts
  durationHours: number;
  maxStudents: number;
  location?: string;
  defaultInstructorId?: number | null;
  defaultAssistantId?: number | null;
}

export interface SessionPreview {
  sessionNumber: number;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
}

/**
 * Parse RRULE and generate session dates
 */
export function generateSessionDates(
  recurrenceRule: string,
  startDate: Date,
  endDate?: Date | null
): Date[] {
  try {
    console.log("generateSessionDates called with:", {
      recurrenceRule,
      startDate,
      endDate,
    });

    // Create a local date without timezone conversion
    const localStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      0,
      0,
      0,
      0
    );

    // Parse the RRULE with dtstart
    const options: any = {
      dtstart: localStart,
    };

    console.log("Calling rrulestr with:", recurrenceRule, options);
    const rule = rrulestr(recurrenceRule, options);

    // Generate all occurrences
    let dates = rule.all();

    // If endDate is provided and the RRULE doesn't have UNTIL, filter dates
    if (endDate && dates.length > 0) {
      const localEnd = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23,
        59,
        59,
        999
      );
      dates = dates.filter((date) => date <= localEnd);
    }

    console.log(`Generated ${dates.length} dates`);
    return dates;
  } catch (error) {
    console.error("Error parsing RRULE:", error);
    throw new Error("Invalid recurrence rule format");
  }
}

/**
 * Calculate end time from start time and duration
 */
export function calculateEndTime(
  startTime: string,
  durationHours: number
): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = addHours(startDate, durationHours);
  return format(endDate, "HH:mm");
}

/**
 * Preview sessions that will be generated from a pattern
 */
export function previewSessions(
  recurrenceRule: string,
  startDate: Date,
  endDate: Date | undefined | null,
  startTime: string,
  durationHours: number,
  endTime?: string
): SessionPreview[] {
  const dates = generateSessionDates(recurrenceRule, startDate, endDate);

  // Check if this is a series schedule (multiple sessions per day)
  // Parse interval from RRULE (but it's not used to determine if series schedule)
  const rruleParts = recurrenceRule.split(";");
  let interval = 1;
  for (const part of rruleParts) {
    if (part.startsWith("INTERVAL=")) {
      interval = parseInt(part.split("=")[1]) || 1;
      break;
    }
  }

  // Series schedule is when endTime is specified and different from start time
  const hasSeriesSchedule = !!endTime && endTime !== startTime;

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const sessions: SessionPreview[] = [];
  let sessionNumber = 0;

  for (const date of dates) {
    if (hasSeriesSchedule && endTime) {
      // Generate multiple sessions per day
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Use durationHours as the interval between sessions (sessions are back-to-back)
      const sessionIntervalMinutes = durationHours * 60;

      let currentMinutes = startMinutes;
      while (currentMinutes <= endMinutes) {
        const currentHour = Math.floor(currentMinutes / 60);
        const currentMin = currentMinutes % 60;
        const currentStartTime = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;

        const sessionEndTime = calculateEndTime(
          currentStartTime,
          durationHours
        );

        sessions.push({
          sessionNumber: ++sessionNumber,
          sessionDate: date,
          startTime: currentStartTime,
          endTime: sessionEndTime,
          dayOfWeek: dayNames[date.getDay()],
        });

        currentMinutes += sessionIntervalMinutes;
      }
    } else {
      // Single session per day
      const sessionEndTime = calculateEndTime(startTime, durationHours);
      sessions.push({
        sessionNumber: ++sessionNumber,
        sessionDate: date,
        startTime,
        endTime: sessionEndTime,
        dayOfWeek: dayNames[date.getDay()],
      });
    }
  }

  return sessions;
}

/**
 * Create a schedule pattern
 */
export async function createSchedulePattern(data: SchedulePatternInput) {
  // Validate the RRULE by trying to parse it
  generateSessionDates(data.recurrenceRule, data.startDate, data.endDate);

  const pattern = await prisma.classSchedulePattern.create({
    data: {
      studioId: data.studioId,
      classId: data.classId,
      classStepId: data.classStepId,
      recurrenceRule: data.recurrenceRule,
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime,
      durationHours: data.durationHours,
      maxStudents: data.maxStudents,
      location: data.location,
      defaultInstructorId: data.defaultInstructorId,
      defaultAssistantId: data.defaultAssistantId,
    },
    include: {
      class: {
        select: {
          name: true,
          teachingRole: {
            select: { name: true },
          },
        },
      },
      classStep: {
        select: {
          name: true,
          stepNumber: true,
        },
      },
    },
  });

  return pattern;
}

/**
 * Get all patterns for a specific class
 */
export async function getPatternsByClass(classId: number) {
  const patterns = await prisma.classSchedulePattern.findMany({
    where: {
      classId,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return patterns;
}

/**
 * Get a single pattern by ID
 */
export async function getPatternById(patternId: number) {
  const pattern = await prisma.classSchedulePattern.findUnique({
    where: { id: patternId },
    include: {
      class: {
        select: {
          name: true,
        },
      },
      classStep: {
        select: {
          name: true,
          stepNumber: true,
        },
      },
    },
  });

  return pattern;
}

/**
 * Regenerate sessions from a pattern (deletes existing sessions first)
 */
export async function regenerateSessionsFromPattern(patternId: number) {
  console.log(
    "[regenerateSessionsFromPattern] Starting for pattern:",
    patternId
  );

  // Delete existing sessions for this pattern
  const deleted = await prisma.classSession.deleteMany({
    where: { schedulePatternId: patternId },
  });

  console.log(
    `[regenerateSessionsFromPattern] Deleted ${deleted.count} existing sessions`
  );

  // Generate new sessions
  return generateSessionsFromPattern(patternId);
}

/**
 * Generate sessions from a pattern
 */
export async function generateSessionsFromPattern(patternId: number) {
  console.log("[generateSessionsFromPattern] Starting for pattern:", patternId);

  // Check if sessions already exist for this pattern
  const existingSessionCount = await prisma.classSession.count({
    where: { schedulePatternId: patternId },
  });

  if (existingSessionCount > 0) {
    console.log(
      `[generateSessionsFromPattern] Pattern ${patternId} already has ${existingSessionCount} sessions, skipping generation`
    );
    return [];
  }

  const pattern = await prisma.classSchedulePattern.findUnique({
    where: { id: patternId },
    include: {
      class: true,
    },
  });

  if (!pattern) {
    throw new Error("Schedule pattern not found");
  }

  if (!pattern.isActive) {
    throw new Error("Cannot generate sessions from inactive pattern");
  }

  console.log("[generateSessionsFromPattern] Pattern loaded:", {
    id: pattern.id,
    recurrenceRule: pattern.recurrenceRule,
    startTime: pattern.startTime,
    endTime: pattern.endTime,
    durationHours: pattern.durationHours.toString(),
  });

  // Generate session dates from pattern
  const sessionDates = generateSessionDates(
    pattern.recurrenceRule,
    pattern.startDate,
    pattern.endDate || undefined
  );

  console.log(
    "[generateSessionsFromPattern] Generated",
    sessionDates.length,
    "dates"
  );

  // Check if this is a series schedule (multiple sessions per day)
  const rruleParts = pattern.recurrenceRule.split(";");
  let interval = 1;
  for (const part of rruleParts) {
    if (part.startsWith("INTERVAL=")) {
      interval = parseInt(part.split("=")[1]) || 1;
      break;
    }
  }

  // Check if this is a series schedule (multiple sessions per day)
  // Series schedule is when endTime is specified and allows for multiple sessions
  const hasSeriesSchedule =
    !!pattern.endTime && pattern.endTime !== pattern.startTime;

  console.log("[generateSessionsFromPattern] Series schedule:", {
    hasSeriesSchedule,
    interval,
    endTime: pattern.endTime,
  });

  // Build session data
  const sessionData = [];
  let sessionNumber = 0;

  for (const sessionDate of sessionDates) {
    if (hasSeriesSchedule && pattern.endTime) {
      // Generate multiple sessions per day
      const [startHour, startMin] = pattern.startTime.split(":").map(Number);
      const [endHour, endMin] = pattern.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Use durationHours as the interval between sessions (sessions are back-to-back)
      const sessionIntervalMinutes = Number(pattern.durationHours) * 60;

      let currentMinutes = startMinutes;
      while (currentMinutes + sessionIntervalMinutes <= endMinutes) {
        const currentHour = Math.floor(currentMinutes / 60);
        const currentMin = currentMinutes % 60;
        const currentStartTime = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;

        const sessionEndTime = calculateEndTime(
          currentStartTime,
          Number(pattern.durationHours)
        );

        sessionData.push({
          studioId: pattern.studioId,
          classId: pattern.classId,
          classStepId: pattern.classStepId,
          schedulePatternId: pattern.id,
          sessionNumber: ++sessionNumber,
          sessionDate,
          startTime: currentStartTime,
          endTime: sessionEndTime,
          maxStudents: pattern.maxStudents,
          location: pattern.location,
          status: "scheduled",
        });

        currentMinutes += sessionIntervalMinutes;
      }
    } else {
      // Single session per day
      const endTime = calculateEndTime(
        pattern.startTime,
        Number(pattern.durationHours)
      );

      sessionData.push({
        studioId: pattern.studioId,
        classId: pattern.classId,
        classStepId: pattern.classStepId,
        schedulePatternId: pattern.id,
        sessionNumber: ++sessionNumber,
        sessionDate,
        startTime: pattern.startTime,
        endTime,
        maxStudents: pattern.maxStudents,
        location: pattern.location,
        status: "scheduled",
      });
    }
  }

  console.log(
    "[generateSessionsFromPattern] Built",
    sessionData.length,
    "session data objects"
  );

  // Create sessions in batches (to avoid transaction size limits)
  const BATCH_SIZE = 50;
  const sessions = [];

  console.log(
    "[generateSessionsFromPattern] Creating sessions in batches of",
    BATCH_SIZE
  );

  for (let i = 0; i < sessionData.length; i += BATCH_SIZE) {
    const batch = sessionData.slice(i, i + BATCH_SIZE);
    console.log(
      `[generateSessionsFromPattern] Creating batch ${Math.floor(i / BATCH_SIZE) + 1} with ${batch.length} sessions`
    );

    try {
      const batchSessions = await prisma.$transaction(
        batch.map((data) => prisma.classSession.create({ data }))
      );
      sessions.push(...batchSessions);
      console.log(
        `[generateSessionsFromPattern] Batch ${Math.floor(i / BATCH_SIZE) + 1} created successfully`
      );
    } catch (error) {
      console.error(
        `[generateSessionsFromPattern] Error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
        error
      );
      throw error;
    }
  }

  console.log(
    "[generateSessionsFromPattern] All",
    sessions.length,
    "sessions created"
  );

  // Auto-assign staff from pattern defaults
  if (pattern.defaultInstructorId || pattern.defaultAssistantId) {
    const staffAssignments = [];

    for (const session of sessions) {
      if (pattern.defaultInstructorId) {
        const instructorData = {
          sessionId: session.id,
          customerId: pattern.defaultInstructorId,
          roleId: null as number | null, // Optional: could lookup from teaching role
        };
        console.log("[Staff Assignment] Instructor data:", instructorData);
        staffAssignments.push(
          prisma.classSessionInstructor.create({
            data: instructorData,
          })
        );
      }

      if (pattern.defaultAssistantId) {
        const assistantData = {
          sessionId: session.id,
          customerId: pattern.defaultAssistantId,
        };
        console.log("[Staff Assignment] Assistant data:", assistantData);
        staffAssignments.push(
          prisma.classSessionAssistant.create({
            data: assistantData,
          })
        );
      }
    }

    // Batch staff assignments too
    for (let i = 0; i < staffAssignments.length; i += BATCH_SIZE) {
      const batch = staffAssignments.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(batch);
    }
  }

  return sessions;
}

/**
 * Update a pattern and regenerate sessions
 */
export async function updateSchedulePattern(
  patternId: number,
  data: Partial<SchedulePatternInput>
) {
  // Validate RRULE if provided
  if (data.recurrenceRule && data.startDate) {
    generateSessionDates(data.recurrenceRule, data.startDate, data.endDate);
  }

  // Build update data object, only including defined fields
  const updateData: any = {};

  if (data.recurrenceRule !== undefined)
    updateData.recurrenceRule = data.recurrenceRule;
  if (data.startDate !== undefined) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate; // Can be null
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime; // Can be null
  if (data.durationHours !== undefined)
    updateData.durationHours = data.durationHours;
  if (data.maxStudents !== undefined) updateData.maxStudents = data.maxStudents;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.defaultInstructorId !== undefined)
    updateData.defaultInstructorId = data.defaultInstructorId;
  if (data.defaultAssistantId !== undefined)
    updateData.defaultAssistantId = data.defaultAssistantId;

  const pattern = await prisma.classSchedulePattern.update({
    where: { id: patternId },
    data: updateData,
    include: {
      sessions: true,
    },
  });

  return pattern;
}

/**
 * Delete future sessions from a pattern
 */
export async function deleteFutureSessions(patternId: number, fromDate: Date) {
  const result = await prisma.classSession.deleteMany({
    where: {
      schedulePatternId: patternId,
      sessionDate: {
        gte: fromDate,
      },
    },
  });

  return result;
}

/**
 * Delete a schedule pattern and all its sessions
 */
export async function deleteSchedulePattern(
  patternId: number,
  studioId: number
) {
  // Verify the pattern belongs to this studio
  const pattern = await prisma.classSchedulePattern.findFirst({
    where: {
      id: patternId,
      studioId,
    },
  });

  if (!pattern) {
    throw new Error("Schedule pattern not found or access denied");
  }

  // Delete all sessions associated with this pattern
  await prisma.classSession.deleteMany({
    where: {
      schedulePatternId: patternId,
    },
  });

  // Delete the pattern itself
  await prisma.classSchedulePattern.delete({
    where: {
      id: patternId,
    },
  });

  return { success: true };
}

/**
 * Update a single session (override pattern)
 */
export async function updateSingleSession(
  sessionId: number,
  data: {
    sessionDate?: Date;
    startTime?: string;
    endTime?: string;
    maxStudents?: number;
    location?: string;
    notes?: string;
    isCancelled?: boolean;
    reserveFullCapacity?: boolean;
    resourceReleaseHours?: number | null;
  }
) {
  const session = await prisma.classSession.update({
    where: { id: sessionId },
    data,
  });

  return session;
}

/**
 * Cancel a single session
 */
export async function cancelSession(sessionId: number, notes?: string) {
  return updateSingleSession(sessionId, {
    isCancelled: true,
    notes: notes || "Session cancelled",
  });
}

/**
 * Build RRULE string from pattern components
 */
export interface RRuleComponents {
  freq: "DAILY" | "WEEKLY" | "MONTHLY";
  interval?: number; // Default 1
  count?: number; // Total occurrences
  until?: Date; // End date
  byweekday?: number[]; // 0=MO, 1=TU, 2=WE, 3=TH, 4=FR, 5=SA, 6=SU
  bymonthday?: number; // Day of month
}

export function buildRRule(components: RRuleComponents): string {
  let rrule = `FREQ=${components.freq}`;

  if (components.interval && components.interval > 1) {
    rrule += `;INTERVAL=${components.interval}`;
  }

  if (components.count) {
    rrule += `;COUNT=${components.count}`;
  }

  if (components.until) {
    const untilStr = format(components.until, "yyyyMMdd'T'HHmmss'Z'");
    rrule += `;UNTIL=${untilStr}`;
  }

  if (components.byweekday && components.byweekday.length > 0) {
    const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
    const byDay = components.byweekday.map((d) => days[d]).join(",");
    rrule += `;BYDAY=${byDay}`;
  }

  if (components.bymonthday) {
    rrule += `;BYMONTHDAY=${components.bymonthday}`;
  }

  return rrule;
}

/**
 * Common pattern presets
 */
export const PATTERN_PRESETS = {
  weeklyOnce: (dayOfWeek: number, count: number) =>
    buildRRule({ freq: "WEEKLY", byweekday: [dayOfWeek], count }),

  weeklyTwice: (days: [number, number], count: number) =>
    buildRRule({ freq: "WEEKLY", byweekday: days, count }),

  biWeekly: (dayOfWeek: number, count: number) =>
    buildRRule({ freq: "WEEKLY", interval: 2, byweekday: [dayOfWeek], count }),

  monthly: (dayOfMonth: number, count: number) =>
    buildRRule({ freq: "MONTHLY", bymonthday: dayOfMonth, count }),
};
