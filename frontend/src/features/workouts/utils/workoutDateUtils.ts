/**
 * Safe local calendar date utilities for LifeSync AI Workout Planner.
 * Prevents UTC timezone shift bugs when serializing dates across international timezones.
 */

/**
 * Format a Date object to YYYY-MM-DD using local calendar components.
 * Avoids toISOString() which shifts local midnight to the previous day in UTC+ timezones.
 */
export const formatLocalDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Parse a YYYY-MM-DD date string (or ISO string) safely into a local Date at 00:00:00.
 * Never causes timezone rollback or UTC day shifting.
 */
export const parseLocalDate = (str: string | Date | null | undefined): Date => {
  if (!str) return new Date();
  if (str instanceof Date) {
    return new Date(str.getFullYear(), str.getMonth(), str.getDate(), 0, 0, 0, 0);
  }
  if (typeof str === 'string' && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime())
    ? new Date()
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
};

/**
 * Return today's Date at local midnight (00:00:00.000).
 */
export const getTodayLocalDate = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

/**
 * Check whether two Date objects represent the same calendar day.
 */
export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Check whether a given Date is today's local calendar date.
 */
export const isDateToday = (d: Date): boolean => {
  return isSameDay(d, new Date());
};

/**
 * Check whether a given Date is strictly before today's local calendar date.
 */
export const isDatePast = (d: Date): boolean => {
  return formatLocalDate(d) < formatLocalDate(new Date());
};

/**
 * Check whether a given Date is strictly after today's local calendar date.
 */
export const isDateFuture = (d: Date): boolean => {
  return formatLocalDate(d) > formatLocalDate(new Date());
};

/**
 * Compute the Monday representing the beginning of the week for a given Date.
 */
export const getMondayOfWeek = (d: Date): Date => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Given a target Date and the week's Monday, returns the 0..6 index within the Monday..Sunday week.
 */
export const getDayIndexInWeek = (date: Date, monday: Date): number => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const m = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
  const diffDays = Math.round((d.getTime() - m.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.min(6, diffDays));
};

/**
 * Convert DayOfWeek (.NET / JS: 0=Sun, 1=Mon, ..., 6=Sat) to Monday-first index (0=Mon, ..., 6=Sun).
 */
export const dayOfWeekToMondayIndex = (dayOfWeek: number): number => {
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
};

/**
 * Convert Monday-first index (0=Mon, ..., 6=Sun) to standard JS DayOfWeek (0=Sun, 1=Mon, ..., 6=Sat).
 */
export const mondayIndexToDayOfWeek = (mondayIdx: number): number => {
  return mondayIdx === 6 ? 0 : mondayIdx + 1;
};
