import { format } from "date-fns";
import { RRule } from "rrule";

/**
 * Parse an RRULE string and generate an array of dates
 * @param rruleString - RRULE format string (e.g., "FREQ=WEEKLY;BYDAY=MO;COUNT=6")
 * @param startDate - Start date for the recurrence
 * @param endDate - Optional end date (if not using COUNT)
 * @returns Array of Date objects
 */
export function parseRRule(
  rruleString: string,
  startDate: Date,
  endDate?: Date
): Date[] {
  try {
    // Parse the RRULE string and add the DTSTART
    const rruleWithDtstart = `DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss'Z'")}\nRRULE:${rruleString}`;

    const rule = RRule.fromString(rruleWithDtstart);

    // Generate dates
    if (endDate) {
      return rule.between(startDate, endDate, true);
    } else {
      return rule.all();
    }
  } catch (error) {
    console.error("Error parsing RRULE:", error);
    throw new Error(`Invalid RRULE format: ${rruleString}`);
  }
}

/**
 * Calculate end time based on start time and duration
 * @param startTime - Start time in HH:MM format (24-hour)
 * @param durationHours - Duration in hours (e.g., 2.5)
 * @returns End time in HH:MM format (24-hour)
 */
export function calculateEndTime(
  startTime: string,
  durationHours: number
): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationHours * 60;

  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = Math.floor(totalMinutes % 60);

  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

/**
 * Format an RRULE string into human-readable text
 * @param rruleString - RRULE format string
 * @returns Human-readable description
 */
export function formatRRuleDescription(rruleString: string): string {
  try {
    const rule = RRule.fromString(`RRULE:${rruleString}`);
    return rule.toText();
  } catch (error) {
    return rruleString;
  }
}

/**
 * Preview sessions that would be generated from an RRULE pattern
 * @param rruleString - RRULE format string
 * @param startDate - Start date
 * @param startTime - Start time in HH:MM format
 * @param durationHours - Duration in hours
 * @param endDate - Optional end date
 * @returns Array of session preview objects
 */
export function previewSessionsFromRRule(
  rruleString: string,
  startDate: Date,
  startTime: string,
  durationHours: number,
  endDate?: Date
): Array<{
  sessionDate: Date;
  startTime: string;
  endTime: string;
  dateDisplay: string;
  timeDisplay: string;
}> {
  const dates = parseRRule(rruleString, startDate, endDate);
  const endTime = calculateEndTime(startTime, durationHours);

  return dates.map((date, index) => ({
    sessionDate: date,
    startTime,
    endTime,
    dateDisplay: format(date, "EEEE, MMMM d, yyyy"),
    timeDisplay: `${startTime} - ${endTime}`,
  }));
}
