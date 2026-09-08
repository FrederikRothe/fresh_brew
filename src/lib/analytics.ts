import type { BrewRecord, WasteRecord } from '@/lib/storage';
import {
  SMALL_BATCH_GRAMS,
  BIG_BATCH_GRAMS,
  SMALL_BATCH_THRESHOLD_MS,
  FRESH_THRESHOLD_MS,
  SOUR_THRESHOLD_MS,
  RESET_THRESHOLD_MS,
  GRAMS_PER_LITER,
  ESPRESSO_DOUBLE_GRAMS,
} from '@/lib/constants';
import {
  formatCphDate,
  formatHourClock,
  getCphHour,
  getCphMinute,
  getCphDayOfWeek,
  getCphDayOfMonth,
  getCphMonth,
  getCphYear,
  getCphISOWeek,
  getCphSecondsSinceMidnight,
  getCphWeekdayShort,
  getCphWeekdayLong,
  getCphMonthLong,
  getCphLastNDates,
  getCphMonthDates,
  dateStringToUtcNoon,
  previousIsoWeek,
  isoWeekKey,
} from '@/lib/utils';

export type PredictionData = {
  time: string;
  isOverdue: boolean;
  overdueMins: number;
};

export type AnalyticsPeriod = 'weekday' | 'last7' | 'month' | 'year';

export const ANALYTICS_PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'weekday', label: 'Typical weekdays' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
];

export type RhythmPoint = {
  unitIdx: number;
  hour: number;
  isSmall: boolean;
  count: number;
  hasOther: boolean;
  dateStr: string;
  timeStr: string;
};

export type RhythmChartData = {
  units: string[];
  currentIdx: number | null;
  points: RhythmPoint[];
  caption: string;
};

export type BurnChartData = {
  labels: string[];
  grams: number[];
  currentIdx: number | null;
  caption: string;
  periodLabel: string;
};

export type FreshnessBreakdown = {
  fresh: number;
  sour: number;
  stale: number;
  empty: number;
  unclassified: number;
  classified: number;
  complianceRate: number;
};

export type WasteRates = {
  bigWasted: number;
  smallWasted: number;
  bigBrews: number;
  smallBrews: number;
  bigRate: number;
  smallRate: number;
  overallRate: number;
};

export type WeekTrend = {
  currentWeekKey: string;
  currentWeekGrams: number;
  lastCompleteWeekKey: string | null;
  lastCompleteWeekGrams: number;
  weekBeforeKey: string | null;
  weekBeforeGrams: number;
  completeWowPct: number | null;
};

export type BrewAnalytics = {
  totalBrews: number;
  totalCoffeeGrams: number;
  bigBrews: number;
  smallBrews: number;
  brewsPerWeek: Record<string, number>;
  hourDistribution: Record<number, number>;
  avgBrewsPerDay: number;
  avgCoffeePerDay: number;
  durationBreakdown: Record<number, number>;
  /** Same-weekday + today only — enough for the daily timeline, not full history. */
  history: BrewRecord[];
  predictedNextBrew: PredictionData | null;
  totalLiters: number;
  espressoEquivalent: number;
  totalWaitingMins: number;
  totalWasteCount: number;
  wasteByDuration: Record<number, number>;
  peakHour: number | null;
  peakHourLabel: string;
  wasteRates: WasteRates;
  freshness: FreshnessBreakdown;
  weekTrend: WeekTrend;
  charts: Record<AnalyticsPeriod, { rhythm: RhythmChartData; burn: BurnChartData }>;
  dayName: string;
  brewsToday: number;
};

const WEEKDAY_UNITS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MONTH_UNITS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MIN_HOUR = 7;
const MAX_HOUR = 18;
const SLOT_SIZE = 1 / 3;
const ISO_WEEKS_IN_BURN = 12;

export function isSmallBatch(durationMs: number): boolean {
  return durationMs <= SMALL_BATCH_THRESHOLD_MS;
}

export function gramsForDuration(durationMs: number): number {
  return isSmallBatch(durationMs) ? SMALL_BATCH_GRAMS : BIG_BATCH_GRAMS;
}

export function slotHour(ts: number): number {
  return getCphHour(ts) + Math.floor(getCphMinute(ts) / 20) * SLOT_SIZE;
}

export function formatSlotTime(hour: number): string {
  const h = Math.floor(hour);
  const mins = Math.round((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function computePredictedNextBrew(
  history: BrewRecord[],
  now: Date | number = Date.now(),
): PredictionData | null {
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const todayStr = formatCphDate(now);
  const todayDayOfWeek = getCphDayOfWeek(now);

  const seqData: Record<number, Record<number, number[]>> = {};
  let lastDateStr = '';
  let currentSeq = 0;

  for (const record of sortedHistory) {
    const dateStr = formatCphDate(record.timestamp);
    const dayOfWeek = getCphDayOfWeek(record.timestamp);
    const secondsSinceMidnight = getCphSecondsSinceMidnight(record.timestamp);

    if (dateStr !== lastDateStr) {
      currentSeq = 0;
      lastDateStr = dateStr;
    } else {
      currentSeq++;
    }

    if (!seqData[dayOfWeek]) seqData[dayOfWeek] = {};
    if (!seqData[dayOfWeek][currentSeq]) seqData[dayOfWeek][currentSeq] = [];
    seqData[dayOfWeek][currentSeq].push(secondsSinceMidnight);
  }

  const brewedTodayCount = sortedHistory.filter(
    (h) => formatCphDate(h.timestamp) === todayStr,
  ).length;
  const typicalTimes = seqData[todayDayOfWeek]?.[brewedTodayCount];

  if (!typicalTimes || typicalTimes.length === 0) return null;

  const avgSeconds = typicalTimes.reduce((a, b) => a + b, 0) / typicalTimes.length;
  const h = Math.floor(avgSeconds / 3600);
  const m = Math.floor((avgSeconds % 3600) / 60);
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const nowSeconds = getCphSecondsSinceMidnight(now);
  const isOverdue = avgSeconds <= nowSeconds;
  const overdueMins = isOverdue ? Math.floor((nowSeconds - avgSeconds) / 60) : 0;

  return { time: timeStr, isOverdue, overdueMins };
}

function classifyLifespan(sinceReadyMs: number): keyof Pick<FreshnessBreakdown, 'fresh' | 'sour' | 'stale' | 'empty'> {
  if (sinceReadyMs < FRESH_THRESHOLD_MS) return 'fresh';
  if (sinceReadyMs < SOUR_THRESHOLD_MS) return 'sour';
  if (sinceReadyMs < RESET_THRESHOLD_MS) return 'stale';
  return 'empty';
}

export function computeFreshnessBreakdown(
  history: BrewRecord[],
  wasteHistory: WasteRecord[],
  now: Date | number = Date.now(),
): FreshnessBreakdown {
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const wasteByBrew = new Map<number, number>();
  for (const w of wasteHistory) {
    if (w.lastBrewTimestamp != null) {
      wasteByBrew.set(w.lastBrewTimestamp, w.timestamp);
    }
  }

  const counts: FreshnessBreakdown = {
    fresh: 0,
    sour: 0,
    stale: 0,
    empty: 0,
    unclassified: 0,
    classified: 0,
    complianceRate: 0,
  };

  const nowMs = typeof now === 'number' ? now : now.getTime();

  for (let i = 0; i < sorted.length; i++) {
    const brew = sorted[i];
    const readyAt = brew.timestamp + brew.durationMs;
    const wasteAt = wasteByBrew.get(brew.timestamp);
    const nextBrewAt = sorted[i + 1]?.timestamp;

    let endAt: number | null = null;
    if (wasteAt != null && nextBrewAt != null) {
      endAt = Math.min(wasteAt, nextBrewAt);
    } else if (wasteAt != null) {
      endAt = wasteAt;
    } else if (nextBrewAt != null) {
      endAt = nextBrewAt;
    }

    if (endAt == null) {
      const sinceReady = nowMs - readyAt;
      if (sinceReady < RESET_THRESHOLD_MS) {
        counts.unclassified++;
        continue;
      }
      endAt = nowMs;
    }

    counts[classifyLifespan(endAt - readyAt)]++;
  }

  counts.classified = counts.fresh + counts.sour + counts.stale + counts.empty;
  counts.complianceRate = counts.classified > 0 ? counts.fresh / counts.classified : 0;
  return counts;
}

export function computeWasteRates(
  history: BrewRecord[],
  wasteHistory: WasteRecord[],
): WasteRates {
  const wasted = new Set(
    wasteHistory
      .map((w) => w.lastBrewTimestamp)
      .filter((ts): ts is number => ts != null),
  );

  let bigBrews = 0;
  let smallBrews = 0;
  let bigWasted = 0;
  let smallWasted = 0;

  for (const brew of history) {
    const wastedBrew = wasted.has(brew.timestamp);
    if (isSmallBatch(brew.durationMs)) {
      smallBrews++;
      if (wastedBrew) smallWasted++;
    } else {
      bigBrews++;
      if (wastedBrew) bigWasted++;
    }
  }

  return {
    bigWasted,
    smallWasted,
    bigBrews,
    smallBrews,
    bigRate: bigBrews > 0 ? bigWasted / bigBrews : 0,
    smallRate: smallBrews > 0 ? smallWasted / smallBrews : 0,
    overallRate: history.length > 0 ? (bigWasted + smallWasted) / history.length : 0,
  };
}

function buildRhythmPoints(
  records: BrewRecord[],
  unitIdxCalc: (ts: number) => number | null,
): RhythmPoint[] {
  const aggregated = new Map<
    string,
    { unitIdx: number; hour: number; smallCount: number; bigCount: number }
  >();

  for (const record of records) {
    const unitIdx = unitIdxCalc(record.timestamp);
    if (unitIdx === null) continue;

    const hour = slotHour(record.timestamp);
    const key = `${unitIdx}-${hour.toFixed(2)}`;
    const existing = aggregated.get(key) || {
      unitIdx,
      hour,
      smallCount: 0,
      bigCount: 0,
    };
    if (isSmallBatch(record.durationMs)) existing.smallCount++;
    else existing.bigCount++;
    aggregated.set(key, existing);
  }

  return Array.from(aggregated.values())
    .filter((d) => d.hour >= MIN_HOUR && d.hour <= MAX_HOUR)
    .flatMap((a) => {
      const timeStr = formatSlotTime(a.hour);
      const points: RhythmPoint[] = [];
      if (a.bigCount > 0) {
        points.push({
          unitIdx: a.unitIdx,
          hour: a.hour,
          isSmall: false,
          count: a.bigCount,
          hasOther: a.smallCount > 0,
          dateStr: `${a.bigCount} big brew${a.bigCount > 1 ? 's' : ''}`,
          timeStr,
        });
      }
      if (a.smallCount > 0) {
        points.push({
          unitIdx: a.unitIdx,
          hour: a.hour,
          isSmall: true,
          count: a.smallCount,
          hasOther: a.bigCount > 0,
          dateStr: `${a.smallCount} small brew${a.smallCount > 1 ? 's' : ''}`,
          timeStr,
        });
      }
      return points;
    });
}

function gramsByDate(history: BrewRecord[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const record of history) {
    const key = formatCphDate(record.timestamp);
    map.set(key, (map.get(key) ?? 0) + gramsForDuration(record.durationMs));
  }
  return map;
}

function gramsByMonth(history: BrewRecord[], year: number): number[] {
  const grams = Array.from({ length: 12 }, () => 0);
  for (const record of history) {
    if (getCphYear(record.timestamp) !== year) continue;
    grams[getCphMonth(record.timestamp)] += gramsForDuration(record.durationMs);
  }
  return grams;
}

function buildWeekdayRhythm(history: BrewRecord[], now: Date | number): RhythmChartData {
  const day = getCphDayOfWeek(now);
  return {
    units: WEEKDAY_UNITS,
    currentIdx: day >= 1 && day <= 5 ? day - 1 : null,
    points: buildRhythmPoints(history, (ts) => {
      const dayIdx = getCphDayOfWeek(ts);
      if (dayIdx === 0 || dayIdx === 6) return null;
      return dayIdx - 1;
    }),
    caption: 'Typical brew times Mon–Fri (all history, Europe/Copenhagen)',
  };
}

function buildLast7Rhythm(history: BrewRecord[], now: Date | number): RhythmChartData {
  const dates = getCphLastNDates(7, now);
  const index = new Map(dates.map((d, i) => [d, i]));
  return {
    units: dates.map((d) => getCphWeekdayShort(dateStringToUtcNoon(d))),
    currentIdx: 6,
    points: buildRhythmPoints(history, (ts) => index.get(formatCphDate(ts)) ?? null),
    caption: 'Brew times over the last 7 Copenhagen calendar days',
  };
}

function buildMonthRhythm(history: BrewRecord[], now: Date | number): RhythmChartData {
  const dates = getCphMonthDates(now);
  const { year, month, day } = {
    ...{ year: getCphYear(now), month: getCphMonth(now) + 1, day: getCphDayOfMonth(now) },
  };
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  return {
    units: dates.map((_, i) => String(i + 1)),
    currentIdx: day - 1,
    points: buildRhythmPoints(history, (ts) => {
      const dateStr = formatCphDate(ts);
      if (!dateStr.startsWith(prefix)) return null;
      return getCphDayOfMonth(ts) - 1;
    }),
    caption: `${getCphMonthLong(now)} ${year} — actual days, not stacked across months`,
  };
}

function buildYearRhythm(history: BrewRecord[], now: Date | number): RhythmChartData {
  const year = getCphYear(now);
  return {
    units: MONTH_UNITS,
    currentIdx: getCphMonth(now),
    points: buildRhythmPoints(history, (ts) => {
      if (getCphYear(ts) !== year) return null;
      return getCphMonth(ts);
    }),
    caption: `${year} — months this year only (Europe/Copenhagen)`,
  };
}

function buildLast7Burn(history: BrewRecord[], now: Date | number): BurnChartData {
  const dates = getCphLastNDates(7, now);
  const byDate = gramsByDate(history);
  const { week, year } = getCphISOWeek(now);
  return {
    labels: dates.map((d) => getCphWeekdayShort(dateStringToUtcNoon(d))),
    grams: dates.map((d) => byDate.get(d) ?? 0),
    currentIdx: 6,
    caption: 'Grams consumed last 7 Copenhagen calendar days',
    periodLabel: `ISO week ${week}, ${year}`,
  };
}

function buildMonthBurn(history: BrewRecord[], now: Date | number): BurnChartData {
  const dates = getCphMonthDates(now);
  const byDate = gramsByDate(history);
  return {
    labels: dates.map((_, i) => String(i + 1)),
    grams: dates.map((d) => byDate.get(d) ?? 0),
    currentIdx: getCphDayOfMonth(now) - 1,
    caption: `Grams consumed in ${getCphMonthLong(now)}`,
    periodLabel: getCphMonthLong(now),
  };
}

function buildYearBurn(history: BrewRecord[], now: Date | number): BurnChartData {
  const year = getCphYear(now);
  return {
    labels: MONTH_UNITS,
    grams: gramsByMonth(history, year),
    currentIdx: getCphMonth(now),
    caption: `Grams consumed in ${year}`,
    periodLabel: String(year),
  };
}

function buildIsoWeekBurn(
  coffeeGramsPerWeek: Record<string, number>,
  now: Date | number,
): BurnChartData {
  const current = getCphISOWeek(now);
  const weeks: { week: number; year: number }[] = [];
  let cursor = current;
  for (let i = 0; i < ISO_WEEKS_IN_BURN; i++) {
    weeks.unshift(cursor);
    cursor = previousIsoWeek(cursor.week, cursor.year);
  }

  return {
    labels: weeks.map((w) => `W${String(w.week).padStart(2, '0')}`),
    grams: weeks.map((w) => coffeeGramsPerWeek[isoWeekKey(w.week, w.year)] ?? 0),
    currentIdx: ISO_WEEKS_IN_BURN - 1,
    caption: 'Grams by ISO week (Copenhagen). Typical weekdays stacks all-time Mon–Fri.',
    periodLabel: isoWeekKey(current.week, current.year),
  };
}

export function computeWeekTrend(
  coffeeGramsPerWeek: Record<string, number>,
  now: Date | number = Date.now(),
): WeekTrend {
  const current = getCphISOWeek(now);
  const lastComplete = previousIsoWeek(current.week, current.year);
  const weekBefore = previousIsoWeek(lastComplete.week, lastComplete.year);
  const currentWeekKey = isoWeekKey(current.week, current.year);
  const lastCompleteWeekKey = isoWeekKey(lastComplete.week, lastComplete.year);
  const weekBeforeKey = isoWeekKey(weekBefore.week, weekBefore.year);
  const currentWeekGrams = coffeeGramsPerWeek[currentWeekKey] ?? 0;
  const lastCompleteWeekGrams = coffeeGramsPerWeek[lastCompleteWeekKey] ?? 0;
  const weekBeforeGrams = coffeeGramsPerWeek[weekBeforeKey] ?? 0;
  const completeWowPct =
    weekBeforeGrams > 0
      ? ((lastCompleteWeekGrams - weekBeforeGrams) / weekBeforeGrams) * 100
      : null;

  return {
    currentWeekKey,
    currentWeekGrams,
    lastCompleteWeekKey,
    lastCompleteWeekGrams,
    weekBeforeKey,
    weekBeforeGrams,
    completeWowPct,
  };
}

function pickPeakHour(hourDistribution: Record<number, number>): number | null {
  const entries = Object.entries(hourDistribution);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]));
  return Number(entries[0][0]);
}

export function computeBrewAnalytics(
  history: BrewRecord[],
  wasteHistory: WasteRecord[],
  now: Date | number = Date.now(),
): BrewAnalytics {
  const brewsPerWeek: Record<string, number> = {};
  const coffeeGramsPerWeek: Record<string, number> = {};
  const hourDistribution: Record<number, number> = {};
  const durationBreakdown: Record<number, number> = {};
  const daysSeen = new Set<string>();
  let totalCoffeeGrams = 0;
  let bigBrews = 0;
  let smallBrews = 0;

  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);

  for (const record of sortedHistory) {
    const dateStr = formatCphDate(record.timestamp);
    const { week, year } = getCphISOWeek(record.timestamp);
    const weekKey = isoWeekKey(week, year);
    brewsPerWeek[weekKey] = (brewsPerWeek[weekKey] ?? 0) + 1;

    const grams = gramsForDuration(record.durationMs);
    coffeeGramsPerWeek[weekKey] = (coffeeGramsPerWeek[weekKey] ?? 0) + grams;
    totalCoffeeGrams += grams;

    if (isSmallBatch(record.durationMs)) smallBrews++;
    else bigBrews++;

    const hour = getCphHour(record.timestamp);
    hourDistribution[hour] = (hourDistribution[hour] ?? 0) + 1;
    durationBreakdown[record.durationMs] = (durationBreakdown[record.durationMs] ?? 0) + 1;
    daysSeen.add(dateStr);
  }

  const avgBrewsPerDay = daysSeen.size > 0 ? sortedHistory.length / daysSeen.size : 0;
  const avgCoffeePerDay = daysSeen.size > 0 ? totalCoffeeGrams / daysSeen.size : 0;
  const peakHour = pickPeakHour(hourDistribution);

  const wasteByDuration: Record<number, number> = {};
  for (const record of wasteHistory) {
    if (record.lastBrewDurationMs) {
      wasteByDuration[record.lastBrewDurationMs] =
        (wasteByDuration[record.lastBrewDurationMs] ?? 0) + 1;
    }
  }

  const todayStr = formatCphDate(now);
  const todayDayOfWeek = getCphDayOfWeek(now);
  const timelineHistory = sortedHistory.filter((h) => {
    const dateStr = formatCphDate(h.timestamp);
    return dateStr === todayStr || getCphDayOfWeek(h.timestamp) === todayDayOfWeek;
  });

  const weekdayRhythm = buildWeekdayRhythm(sortedHistory, now);
  const last7Rhythm = buildLast7Rhythm(sortedHistory, now);
  const monthRhythm = buildMonthRhythm(sortedHistory, now);
  const yearRhythm = buildYearRhythm(sortedHistory, now);

  return {
    totalBrews: sortedHistory.length,
    totalCoffeeGrams,
    bigBrews,
    smallBrews,
    brewsPerWeek,
    hourDistribution,
    avgBrewsPerDay,
    avgCoffeePerDay,
    durationBreakdown,
    history: timelineHistory,
    predictedNextBrew: computePredictedNextBrew(sortedHistory, now),
    totalLiters: totalCoffeeGrams / GRAMS_PER_LITER,
    espressoEquivalent: totalCoffeeGrams / ESPRESSO_DOUBLE_GRAMS,
    totalWaitingMins: sortedHistory.reduce((acc, h) => acc + h.durationMs / 60000, 0),
    totalWasteCount: wasteHistory.length,
    wasteByDuration,
    peakHour,
    peakHourLabel: peakHour == null ? '--' : formatHourClock(peakHour),
    wasteRates: computeWasteRates(sortedHistory, wasteHistory),
    freshness: computeFreshnessBreakdown(sortedHistory, wasteHistory, now),
    weekTrend: computeWeekTrend(coffeeGramsPerWeek, now),
    charts: {
      weekday: { rhythm: weekdayRhythm, burn: buildIsoWeekBurn(coffeeGramsPerWeek, now) },
      last7: { rhythm: last7Rhythm, burn: buildLast7Burn(sortedHistory, now) },
      month: { rhythm: monthRhythm, burn: buildMonthBurn(sortedHistory, now) },
      year: { rhythm: yearRhythm, burn: buildYearBurn(sortedHistory, now) },
    },
    dayName: getCphWeekdayLong(now),
    brewsToday: sortedHistory.filter((h) => formatCphDate(h.timestamp) === todayStr).length,
  };
}