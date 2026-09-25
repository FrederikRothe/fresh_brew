import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/storage', () => ({ readBrewHistory: vi.fn(async () => []) }));

import { getPredictedNextBrew } from '@/app/actions';

// September is CEST (UTC+2); 2026-09-17 and 2026-09-24 are Thursdays
const brew = (date: string, time: string) => ({
  timestamp: new Date(`${date}T${time}:00+02:00`).getTime(),
  durationMs: 420000,
});
const setNow = (date: string, time: string) =>
  vi.setSystemTime(new Date(`${date}T${time}:00+02:00`));

describe('getPredictedNextBrew', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const lastThursday = [
    brew('2026-09-17', '08:00'),
    brew('2026-09-17', '09:00'),
    brew('2026-09-17', '10:00'),
  ];

  it('predicts the first pot of the day from the same weekday', async () => {
    setNow('2026-09-24', '07:00');
    const result = await getPredictedNextBrew(lastThursday);
    expect(result).toEqual({
      time: '08:00',
      timestamp: new Date('2026-09-24T08:00:00+02:00').getTime(),
    });
  });

  it('predicts the next pot in today\'s sequence', async () => {
    setNow('2026-09-24', '08:00');
    const result = await getPredictedNextBrew([...lastThursday, brew('2026-09-24', '07:55')]);
    expect(result?.time).toBe('09:00');
  });

  it('averages across weeks', async () => {
    setNow('2026-09-24', '07:00');
    const result = await getPredictedNextBrew([
      brew('2026-09-10', '07:40'),
      brew('2026-09-17', '08:20'),
    ]);
    expect(result?.time).toBe('08:00');
  });

  it('shifts the prediction when today\'s last pot came later than usual', async () => {
    setNow('2026-09-24', '10:31');
    const result = await getPredictedNextBrew([
      ...lastThursday,
      brew('2026-09-24', '08:00'),
      brew('2026-09-24', '10:25'),
    ]);
    // Typical pot #3 is at 10:00, but pot #2 only happened at 10:25; typical gap is 1h
    expect(result?.time).toBe('11:25');
    expect(result!.timestamp).toBeGreaterThan(Date.now());
  });

  it('returns null when there is no history for the next sequence', async () => {
    setNow('2026-09-24', '11:00');
    const result = await getPredictedNextBrew([
      ...lastThursday,
      brew('2026-09-24', '08:00'),
      brew('2026-09-24', '09:00'),
      brew('2026-09-24', '10:00'),
    ]);
    expect(result).toBeNull();
  });

  it('ignores other weekdays', async () => {
    setNow('2026-09-24', '07:00');
    const result = await getPredictedNextBrew([brew('2026-09-23', '08:00')]);
    expect(result).toBeNull();
  });

  it('buckets brews by Copenhagen date, not UTC', async () => {
    // 00:30 CEST on Thursday is still Wednesday in UTC
    setNow('2026-09-24', '00:10');
    const result = await getPredictedNextBrew([brew('2026-09-17', '00:30')]);
    expect(result?.time).toBe('00:30');
  });
});
