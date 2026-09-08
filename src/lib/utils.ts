import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CPH_TZ = 'Europe/Copenhagen';

const cphDateFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  timeZone: CPH_TZ,
});

const cphTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', hour12: false,
  timeZone: CPH_TZ,
});

const cphHourFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric', hour12: false,
  timeZone: CPH_TZ,
});

const cphDayOfWeekFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  timeZone: CPH_TZ,
});

const cphTimePartsFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  timeZone: CPH_TZ,
});

const cphMonthShortFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: CPH_TZ,
});

const cphMonthLongFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  timeZone: CPH_TZ,
});

const cphWeekdayLongFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  timeZone: CPH_TZ,
});

/** Returns "yyyy-MM-dd" in Copenhagen time */
export function formatCphDate(ts: number | Date): string {
  return cphDateFormatter.format(ts);
}

/** Returns "HH:mm" in Copenhagen time */
export function formatCphTime(ts: number | Date): string {
  return cphTimeFormatter.format(ts);
}

/** Returns the hour (0–23) in Copenhagen time */
export function getCphHour(ts: number | Date): number {
  return parseInt(cphHourFormatter.format(ts), 10);
}

/** Returns day of week (0-6, 0=Sun) in Copenhagen time */
export function getCphDayOfWeek(ts: number | Date): number {
  const day = cphDayOfWeekFormatter.format(ts);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.indexOf(day);
}

/** Returns { week, year } for ISO week in Copenhagen time */
export function getCphISOWeek(ts: number | Date): { week: number; year: number } {
  // We use the 'en-GB' locale as it follows ISO week standards (Monday start)
  const partFormatter = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: CPH_TZ,
  });
  
  const parts = partFormatter.formatToParts(ts);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
  
  // Create a UTC date at midnight in the CPH timezone to use with date-fns
  // date-fns's getISOWeek and getISOWeekYear are timezone-agnostic (operate on the given Date object's UTC fields if they are standard)
  // but standard JS Date doesn't let us easily set "CPH time".
  // However, we can calculate ISO week manually or use a trick.
  // The simplest reliable way for ISO week is actually calculating it.
  
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return { week, year: d.getUTCFullYear() };
}

/** Returns seconds since midnight in Copenhagen time */
export function getCphSecondsSinceMidnight(ts: number | Date): number {
  const parts = cphTimePartsFormatter.formatToParts(ts);
  const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const s = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
  return h * 3600 + m * 60 + s;
}

/** Returns the minute (0–59) in Copenhagen time */
export function getCphMinute(ts: number | Date): number {
  const parts = cphTimePartsFormatter.formatToParts(ts);
  return parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
}

export type CphDateParts = { year: number; month: number; day: number };

/** Calendar Y/M/D in Copenhagen (month is 1–12). */
export function getCphDateParts(ts: number | Date): CphDateParts {
  const [year, month, day] = formatCphDate(ts).split('-').map(Number);
  return { year, month, day };
}

/** Returns calendar year in Copenhagen time */
export function getCphYear(ts: number | Date): number {
  return getCphDateParts(ts).year;
}

/** Returns 0–11 month index in Copenhagen time */
export function getCphMonth(ts: number | Date): number {
  return getCphDateParts(ts).month - 1;
}

/** Returns 1–31 day of month in Copenhagen time */
export function getCphDayOfMonth(ts: number | Date): number {
  return getCphDateParts(ts).day;
}

/** Short weekday name in Copenhagen (e.g. "Wed") */
export function getCphWeekdayShort(ts: number | Date): string {
  return cphDayOfWeekFormatter.format(ts);
}

/** Long weekday name in Copenhagen (e.g. "Wednesday") */
export function getCphWeekdayLong(ts: number | Date): string {
  return cphWeekdayLongFormatter.format(ts);
}

/** Short month name in Copenhagen (e.g. "Mar") */
export function getCphMonthShort(ts: number | Date): string {
  return cphMonthShortFormatter.format(ts);
}

/** Long month name in Copenhagen (e.g. "March") */
export function getCphMonthLong(ts: number | Date): string {
  return cphMonthLongFormatter.format(ts);
}

/** Formats an hour 0–23 as a 24h Copenhagen clock label, e.g. "09:00". */
export function formatHourClock(hour: number): string {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

/**
 * Shift a `yyyy-MM-dd` civil date by a number of calendar days.
 * Operates on the date string itself so it is timezone-agnostic.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Noon UTC on a civil date is always the same calendar day in Copenhagen
 * (UTC+1 / UTC+2), so it is a safe instant for weekday/month helpers.
 */
export function dateStringToUtcNoon(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00Z`);
}

/** Last `n` Copenhagen calendar dates, oldest → today. */
export function getCphLastNDates(n: number, ts: number | Date = Date.now()): string[] {
  const today = formatCphDate(ts);
  return Array.from({ length: n }, (_, i) => addDaysToDateString(today, -(n - 1 - i)));
}

/** All `yyyy-MM-dd` dates in the Copenhagen month containing `ts`. */
export function getCphMonthDates(ts: number | Date = Date.now()): string[] {
  const { year, month } = getCphDateParts(ts);
  const dates: string[] = [];
  for (let day = 1; day <= 31; day++) {
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCMonth() !== month - 1) break;
    dates.push(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    );
  }
  return dates;
}

/** ISO week immediately before `{ week, year }`. */
export function previousIsoWeek(week: number, year: number): { week: number; year: number } {
  if (week > 1) return { week: week - 1, year };
  // 28 Dec is always in the last ISO week of its year.
  return getCphISOWeek(new Date(Date.UTC(year - 1, 11, 28, 12)));
}

export function isoWeekKey(week: number, year: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Formats a number of minutes into "Xh Ym" or just "Ym" */
export function formatMinsToDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}
