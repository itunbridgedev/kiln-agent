import { addHours, format } from "date-fns";
import { rrulestr } from "rrule";
import prisma from "../prisma";

export interface SchedulePatternInput {
  classId: number;
  classStepId?: number;
  studioId: number;
  recurrenceRule: string; // RRULE format: "FREQ=WEEKLY;BYDAY=TU;COUNT=8"
  startDate: Date;
  endDate?: Date;
  startTime: string; // "HH:MM" format
  durationHours: number;
  maxStudents: number;
  location?: string;
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
  endDate?: Date
): Date[] {
  try {
    // Build RRULE string with dtstart
    let rruleString = recurrenceRule;

    // Parse the RRULE with options
    const options: any = {
      dtstart: startDate,
    };

    if (endDate) {
      options.until = endDate;
    }

    const rule = rrulestr(rruleString, options);

    // Generate all occurrences
    const dates = rule.all();
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
  endDate: Date | undefined,
  startTime: string,
  durationHours: number
): SessionPreview[] {
  const dates = generateSessionDates(recurrenceRule, startDate, endDate);
  const endTime = calculateEndTime(startTime, durationHours);

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return dates.map((date, index) => ({
    sessionNumber: index + 1,
    sessionDate: date,
    startTime,
    endTime,
    dayOfWeek: dayNames[date.getDay()],
  }));
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
      durationHours: data.durationHours,
      maxStudents: data.maxStudents,
      location: data.location,
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
 * Generate sessions from a pattern
 */
export async function generateSessionsFromPattern(patternId: number) {
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

  // Generate session dates from pattern
  const sessionDates = generateSessionDates(
    pattern.recurrenceRule,
    pattern.startDate,
    pattern.endDate || undefined
  );

  const endTime = calculateEndTime(
    pattern.startTime,
    Number(pattern.durationHours)
  );

  // Create sessions in batch
  const sessions = await prisma.$transaction(
    sessionDates.map((sessionDate, index) =>
      prisma.classSession.create({
        data: {
          studioId: pattern.studioId,
          classId: pattern.classId,
          classStepId: pattern.classStepId,
          schedulePatternId: pattern.id,
          sessionNumber: index + 1,
          sessionDate,
          startTime: pattern.startTime,
          endTime,
          maxStudents: pattern.maxStudents,
          location: pattern.location,
          status: "scheduled",
        },
      })
    )
  );

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

  const pattern = await prisma.classSchedulePattern.update({
    where: { id: patternId },
    data: {
      recurrenceRule: data.recurrenceRule,
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      durationHours: data.durationHours,
      maxStudents: data.maxStudents,
      location: data.location,
    },
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
