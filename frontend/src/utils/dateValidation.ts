/**
 * LifeSync AI - Standardized Date & Time Validation and Year Constraint Utility
 *
 * Ensures:
 * 1. Year portion is constrained to exactly four digits (no 5th digit allowed).
 * 2. Works for both ISO YYYY-MM-DD (and YYYY-MM-DDTHH:mm) and locale formats like DD-MM-YYYY.
 * 3. Preserves the time portion of date-time inputs unchanged.
 * 4. Provides HTML5 input constraints (min/max) for native calendar pickers.
 */

/**
 * Constrains the year segment of any date or datetime string to a maximum of 4 digits.
 * If the user types or pastes a 5th digit in the year, it is automatically truncated.
 */
export function clampYearToFourDigits(val: string): string {
  if (!val) return '';

  // Format 1: YYYY-MM-DD or YYYY-MM-DDTHH:mm... (ISO standard input values)
  if (val.includes('-')) {
    const parts = val.split('-');
    // If year is the first component (parts[0])
    if (parts.length >= 3 && parts[0].length > 4) {
      return [parts[0].slice(0, 4), ...parts.slice(1)].join('-');
    }
    // If year is the third component: DD-MM-YYYY or DD-MM-YYYYTHH:mm / DD-MM-YYYY HH:mm
    if (parts.length >= 3) {
      const remainder = parts[2];
      const match = remainder.match(/^(\d{4})\d+(.*)$/);
      if (match) {
        parts[2] = match[1] + match[2];
        return parts.join('-');
      }
    }
  }

  // Format 2: Slash separated MM/DD/YYYY or YYYY/MM/DD
  if (val.includes('/')) {
    const parts = val.split('/');
    if (parts.length >= 3 && parts[0].length > 4) {
      return [parts[0].slice(0, 4), ...parts.slice(1)].join('/');
    }
    if (parts.length >= 3) {
      const remainder = parts[2];
      const match = remainder.match(/^(\d{4})\d+(.*)$/);
      if (match) {
        parts[2] = match[1] + match[2];
        return parts.join('/');
      }
    }
  }

  return val;
}

/**
 * Validates that the date string has a valid 4-digit year within the specified range [minYear, maxYear].
 * Defaults to 1900 to 2099. Returns true if empty (to let 'required' validation handle empty state).
 */
export function isValidFourDigitYear(
  val: string,
  minYear = 1900,
  maxYear = 2099
): boolean {
  if (!val) return true;

  let yearNum: number | null = null;

  if (val.includes('-')) {
    const parts = val.split('-');
    if (parts[0].length === 4 && /^\d{4}$/.test(parts[0])) {
      yearNum = parseInt(parts[0], 10);
    } else if (parts.length >= 3) {
      const match = parts[2].match(/^(\d{4})/);
      if (match) yearNum = parseInt(match[1], 10);
    }
  } else if (val.includes('/')) {
    const parts = val.split('/');
    if (parts[0].length === 4 && /^\d{4}$/.test(parts[0])) {
      yearNum = parseInt(parts[0], 10);
    } else if (parts.length >= 3) {
      const match = parts[2].match(/^(\d{4})/);
      if (match) yearNum = parseInt(match[1], 10);
    }
  }

  if (yearNum === null) {
    const parsed = new Date(val);
    if (isNaN(parsed.getTime())) return false;
    yearNum = parsed.getFullYear();
  }

  return !isNaN(yearNum) && yearNum >= minYear && yearNum <= maxYear;
}

/**
 * Standardized input slotProps for native HTML5 date inputs
 */
export const STANDARD_DATE_INPUT_PROPS = {
  inputLabel: { shrink: true },
  htmlInput: {
    min: '1900-01-01',
    max: '2099-12-31'
  }
};

/**
 * Standardized input slotProps for native HTML5 datetime-local inputs
 */
export const STANDARD_DATETIME_INPUT_PROPS = {
  inputLabel: { shrink: true },
  htmlInput: {
    min: '1900-01-01T00:00',
    max: '2099-12-31T23:59'
  }
};
