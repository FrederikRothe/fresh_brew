import { describe, it, expect } from 'vitest';
import { formatCphDate, formatCphTime, getCphHour } from '@/lib/utils';

// Copenhagen is CET (UTC+1) in winter and CEST (UTC+2) in summer.
// All timestamps below are in UTC; expected values are in Copenhagen local time.

describe('formatCphDate', () => {
  it('returns yyyy-MM-dd in winter (UTC+1)', () => {
    // 2026-01-15 10:30 UTC = 2026-01-15 11:30 CET
    expect(formatCphDate(new Date('2026-01-15T10:30:00Z'))).toBe('2026-01-15');
  });

  it('returns yyyy-MM-dd in summer (UTC+2)', () => {
    // 2026-07-15 10:30 UTC = 2026-07-15 12:30 CEST
    expect(formatCphDate(new Date('2026-07-15T10:30:00Z'))).toBe('2026-07-15');
  });

  it('returns the next day when UTC midnight has already passed in Copenhagen (winter)', () => {
    // 2026-01-15 23:30 UTC = 2026-01-16 00:30 CET — server in UTC would say Jan 15
    expect(formatCphDate(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16');
  });

  it('returns the next day when UTC midnight has already passed in Copenhagen (summer)', () => {
    // 2026-07-15 22:30 UTC = 2026-07-16 00:30 CEST — server in UTC would say Jul 15
    expect(formatCphDate(new Date('2026-07-15T22:30:00Z'))).toBe('2026-07-16');
  });

  it('accepts a numeric timestamp', () => {
    expect(formatCphDate(new Date('2026-01-15T10:30:00Z').getTime())).toBe('2026-01-15');
  });
});

describe('formatCphTime', () => {
  it('returns HH:mm in winter (UTC+1)', () => {
    // 2026-01-15 10:30 UTC = 11:30 CET
    expect(formatCphTime(new Date('2026-01-15T10:30:00Z'))).toBe('11:30');
  });

  it('returns HH:mm in summer (UTC+2)', () => {
    // 2026-07-15 10:30 UTC = 12:30 CEST
    expect(formatCphTime(new Date('2026-07-15T10:30:00Z'))).toBe('12:30');
  });

  it('returns 00:30 when it is just past midnight in Copenhagen (winter)', () => {
    // 2026-01-15 23:30 UTC = 00:30 CET
    expect(formatCphTime(new Date('2026-01-15T23:30:00Z'))).toBe('00:30');
  });

  it('returns 00:30 when it is just past midnight in Copenhagen (summer)', () => {
    // 2026-07-15 22:30 UTC = 00:30 CEST
    expect(formatCphTime(new Date('2026-07-15T22:30:00Z'))).toBe('00:30');
  });

  it('accepts a numeric timestamp', () => {
    expect(formatCphTime(new Date('2026-01-15T10:30:00Z').getTime())).toBe('11:30');
  });
});

describe('getCphHour', () => {
  it('returns Copenhagen hour in winter (UTC+1)', () => {
    // 2026-01-15 10:00 UTC = hour 11 CET
    expect(getCphHour(new Date('2026-01-15T10:00:00Z'))).toBe(11);
  });

  it('returns Copenhagen hour in summer (UTC+2)', () => {
    // 2026-07-15 10:00 UTC = hour 12 CEST
    expect(getCphHour(new Date('2026-07-15T10:00:00Z'))).toBe(12);
  });

  it('returns 0 just past midnight Copenhagen time (winter)', () => {
    // 2026-01-15 23:30 UTC = hour 0 CET — server in UTC would return 23
    expect(getCphHour(new Date('2026-01-15T23:30:00Z'))).toBe(0);
  });

  it('returns 0 just past midnight Copenhagen time (summer)', () => {
    // 2026-07-15 22:30 UTC = hour 0 CEST — server in UTC would return 22
    expect(getCphHour(new Date('2026-07-15T22:30:00Z'))).toBe(0);
  });

  it('accepts a numeric timestamp', () => {
    expect(getCphHour(new Date('2026-01-15T10:00:00Z').getTime())).toBe(11);
  });
});
