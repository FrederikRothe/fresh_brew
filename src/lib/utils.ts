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
