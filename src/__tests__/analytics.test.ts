import { describe, it, expect } from 'vitest';
import {
  computeBrewAnalytics,
  computeFreshnessBreakdown,
  computeWasteRates,
  computePredictedNextBrew,
  computeWeekTrend,
  slotHour,
  formatSlotTime,
  gramsForDuration,
} from '@/lib/analytics';
import {
  BIG_BATCH_GRAMS,
  SMALL_BATCH_GRAMS,
  FRESH_THRESHOLD_MS,
  SOUR_THRESHOLD_MS,
  RESET_THRESHOLD_MS,
} from '@/lib/constants';
import type { BrewRecord, WasteRecord } from '@/lib/storage';

const BIG = 7 * 60 * 1000;
const SMALL = 4 * 60 * 1000;

function brew(iso: string, durationMs = BIG): BrewRecord {
  return { timestamp: new Date(iso).getTime(), durationMs };
}

describe('analytics helpers', () => {
  it('uses Copenhagen hour/minute for 20-minute slots', () => {
    // 08:20 UTC = 09:20 CET
    expect(slotHour(new Date('2026-03-18T08:20:00Z').getTime())).toBeCloseTo(9 + 1 / 3, 5);
    expect(formatSlotTime(9 + 1 / 3)).toBe('09:20');
  });

  it('maps batch duration to grams', () => {
    expect(gramsForDuration(SMALL)).toBe(SMALL_BATCH_GRAMS);
    expect(gramsForDuration(BIG)).toBe(BIG_BATCH_GRAMS);
  });
});

describe('computeBrewAnalytics timezone grouping', () => {
  it('attributes a UTC-yesterday brew to today when it is after midnight in Copenhagen', () => {
    // now = 01:30 CET on 16 Jan 2026
    const now = new Date('2026-01-16T00:30:00Z');
    // 00:30 CET on 16 Jan — UTC would call this 15 Jan
    const records = [brew('2026-01-15T23:30:00Z')];
    const analytics = computeBrewAnalytics(records, [], now);

    expect(analytics.brewsToday).toBe(1);
    expect(analytics.charts.last7.burn.grams[6]).toBe(BIG_BATCH_GRAMS);
    expect(analytics.charts.last7.burn.grams.slice(0, 6).every((g) => g === 0)).toBe(true);
  });

  it('formats the peak hour as HH:mm in Copenhagen', () => {
    const now = new Date('2026-03-18T12:00:00Z');
    const analytics = computeBrewAnalytics(
      [
        brew('2026-03-18T08:00:00Z'), // 09:00 CET
        brew('2026-03-18T08:10:00Z'),
        brew('2026-03-18T09:00:00Z'), // 10:00 CET
      ],
      [],
      now,
    );
    expect(analytics.peakHour).toBe(9);
    expect(analytics.peakHourLabel).toBe('09:00');
  });

  it('does not stack other months into this-month rhythm', () => {
    const now = new Date('2026-03-18T12:00:00Z');
    const analytics = computeBrewAnalytics(
      [
        brew('2026-02-18T08:00:00Z'),
        brew('2026-03-18T08:00:00Z'),
      ],
      [],
      now,
    );
    const marchPoints = analytics.charts.month.rhythm.points;
    expect(marchPoints).toHaveLength(1);
    expect(marchPoints[0].count).toBe(1);
    expect(analytics.charts.month.rhythm.currentIdx).toBe(17);
    expect(analytics.charts.month.burn.grams[17]).toBe(BIG_BATCH_GRAMS);
    expect(analytics.charts.month.burn.grams[17 - 1] ?? 0).toBe(0);
  });

  it('does not stack other years into this-year burn', () => {
    const now = new Date('2026-03-18T12:00:00Z');
    const analytics = computeBrewAnalytics(
      [
        brew('2025-03-18T08:00:00Z'),
        brew('2026-03-18T08:00:00Z'),
      ],
      [],
      now,
    );
    expect(analytics.charts.year.burn.grams[2]).toBe(BIG_BATCH_GRAMS);
    expect(analytics.charts.year.rhythm.points).toHaveLength(1);
  });

  it('weekday rhythm stacks all Mondays and skips weekends', () => {
    const now = new Date('2026-03-18T12:00:00Z'); // Wednesday
    const analytics = computeBrewAnalytics(
      [
        brew('2026-03-16T08:00:00Z'), // Monday
        brew('2026-03-09T08:00:00Z'), // previous Monday
        brew('2026-03-15T08:00:00Z'), // Sunday
      ],
      [],
      now,
    );
    const monday = analytics.charts.weekday.rhythm.points.filter((p) => p.unitIdx === 0);
    expect(monday[0].count).toBe(2);
    expect(analytics.charts.weekday.rhythm.points.every((p) => p.unitIdx !== undefined)).toBe(true);
    expect(analytics.charts.weekday.rhythm.currentIdx).toBe(2);
  });

  it('labels last-7-days burn as last 7 calendar days, not a stacked weekday map', () => {
    const now = new Date('2026-03-20T12:00:00Z');
    const analytics = computeBrewAnalytics([brew('2026-03-20T08:00:00Z')], [], now);
    expect(analytics.charts.last7.burn.caption).toMatch(/last 7/i);
    expect(analytics.charts.last7.burn.periodLabel).toMatch(/ISO week 12/i);
    expect(analytics.charts.last7.burn.labels).toHaveLength(7);
    expect(analytics.charts.weekday.rhythm.caption).toMatch(/all history/i);
  });

  it('only sends same-weekday history to the client timeline payload', () => {
    const now = new Date('2026-03-18T12:00:00Z');
    const analytics = computeBrewAnalytics(
      [
        brew('2026-03-18T08:00:00Z'), // Wed
        brew('2026-03-17T08:00:00Z'), // Tue
        brew('2026-03-11T08:00:00Z'), // previous Wed
      ],
      [],
      now,
    );
    expect(analytics.history).toHaveLength(2);
    expect(analytics.totalBrews).toBe(3);
  });
});

describe('freshness compliance', () => {
  it('classifies pots from ready-time until the next brew or waste', () => {
    const t0 = new Date('2026-03-18T08:00:00Z').getTime();
    const ready = t0 + BIG;
    const history: BrewRecord[] = [
      { timestamp: t0, durationMs: BIG },
      { timestamp: ready + FRESH_THRESHOLD_MS - 60_000, durationMs: BIG }, // still fresh
      { timestamp: ready + FRESH_THRESHOLD_MS - 60_000 + BIG, durationMs: BIG },
    ];
    // Third brew is current and only 10 min old
    const now = history[2].timestamp + BIG + 10 * 60_000;
    const waste: WasteRecord[] = [];
    const breakdown = computeFreshnessBreakdown(history, waste, now);
    expect(breakdown.fresh).toBe(2);
    expect(breakdown.unclassified).toBe(1);
    expect(breakdown.complianceRate).toBe(1);
  });

  it('marks a dumped pot stale when waste lands after the sour window', () => {
    const t0 = new Date('2026-03-18T08:00:00Z').getTime();
    const history = [{ timestamp: t0, durationMs: BIG }];
    const waste: WasteRecord[] = [
      {
        timestamp: t0 + BIG + SOUR_THRESHOLD_MS + 60_000,
        lastBrewTimestamp: t0,
        lastBrewDurationMs: BIG,
      },
    ];
    const breakdown = computeFreshnessBreakdown(history, waste, t0 + RESET_THRESHOLD_MS);
    expect(breakdown.stale).toBe(1);
    expect(breakdown.fresh).toBe(0);
    expect(breakdown.complianceRate).toBe(0);
  });

  it('treats an abandoned pot past the reset threshold as empty', () => {
    const t0 = new Date('2026-03-18T08:00:00Z').getTime();
    const now = t0 + BIG + RESET_THRESHOLD_MS + 60_000;
    const breakdown = computeFreshnessBreakdown([{ timestamp: t0, durationMs: BIG }], [], now);
    expect(breakdown.empty).toBe(1);
    expect(breakdown.unclassified).toBe(0);
  });
});

describe('waste rates', () => {
  it('reports percent of each pot size that was dumped, not just counts', () => {
    const big1 = brew('2026-03-16T08:00:00Z', BIG);
    const big2 = brew('2026-03-16T10:00:00Z', BIG);
    const big3 = brew('2026-03-17T08:00:00Z', BIG);
    const big4 = brew('2026-03-17T10:00:00Z', BIG);
    const small1 = brew('2026-03-18T08:00:00Z', SMALL);
    const small2 = brew('2026-03-18T09:00:00Z', SMALL);
    const rates = computeWasteRates(
      [big1, big2, big3, big4, small1, small2],
      [
        { timestamp: big1.timestamp + 40 * 60_000, lastBrewTimestamp: big1.timestamp, lastBrewDurationMs: BIG },
        { timestamp: small1.timestamp + 40 * 60_000, lastBrewTimestamp: small1.timestamp, lastBrewDurationMs: SMALL },
      ],
    );
    expect(rates.bigWasted).toBe(1);
    expect(rates.smallWasted).toBe(1);
    expect(rates.bigRate).toBe(0.25);
    expect(rates.smallRate).toBe(0.5);
    expect(rates.overallRate).toBeCloseTo(2 / 6);
  });
});

describe('week trend', () => {
  it('compares the last complete ISO week to the week before, not the partial current week', () => {
    // Wednesday 18 Mar 2026 is ISO week 12. Last complete = W11, week before = W10.
    const trend = computeWeekTrend(
      {
        '2026-W12': 340,
        '2026-W11': 1000,
        '2026-W10': 500,
      },
      new Date('2026-03-18T12:00:00Z'),
    );
    expect(trend.currentWeekKey).toBe('2026-W12');
    expect(trend.currentWeekGrams).toBe(340);
    expect(trend.lastCompleteWeekKey).toBe('2026-W11');
    expect(trend.lastCompleteWeekGrams).toBe(1000);
    expect(trend.weekBeforeGrams).toBe(500);
    expect(trend.completeWowPct).toBe(100);
  });
});

describe('predicted next brew', () => {
  it('flags the prediction as overdue after the typical time', () => {
    const history = [
      brew('2026-03-11T08:00:00Z'), // last Wednesday pot #1 ~09:00 CET
      brew('2026-03-11T10:00:00Z'), // last Wednesday pot #2 ~11:00 CET
      brew('2026-03-18T08:00:00Z'), // today already had pot #1
    ];
    const now = new Date('2026-03-18T12:00:00Z'); // 13:00 CET
    const prediction = computePredictedNextBrew(history, now);
    expect(prediction).not.toBeNull();
    expect(prediction?.isOverdue).toBe(true);
    expect(prediction?.overdueMins).toBeGreaterThan(0);
  });
});
