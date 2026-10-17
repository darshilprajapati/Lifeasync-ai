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
 * Compute the Monday representing the beginning of the week for a given Date.
 */
export const getMondayOfWeek = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};
