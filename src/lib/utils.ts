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
