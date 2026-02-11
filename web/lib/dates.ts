/**
 * Parse a date-only string (e.g. "2026-02-12") as a local-timezone date.
 *
 * Using `new Date("2026-02-12")` creates a UTC midnight date, which shifts
 * to the previous day in western timezones (e.g. Mountain Time = UTC-7).
 *
 * This function creates a Date at local midnight instead, so formatting
 * always shows the intended calendar date regardless of timezone.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}
