"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  cn,
  formatCphDate,
  getCphDayOfWeek,
  getCphISOWeek,
  getCphSecondsSinceMidnight,
} from "@/lib/utils";
import { SMALL_BATCH_THRESHOLD_MS } from "@/lib/constants";

export type RhythmMode = "weekly" | "monthly" | "yearly";
export type BrewFilter = "all" | "big" | "small";

export interface RhythmCell {
  big: number;
  small: number;
}

export interface RhythmBuckets {
  units: string[];
  /** grid[unitIdx][slotIdx] */
  grid: RhythmCell[][];
  /** Number of distinct periods (weeks / months / years) the data spans */
  periods: number;
}

/** Visible window: 07:00 – 18:00 Copenhagen time, 30-minute slots */
export const MIN_HOUR = 7;
export const MAX_HOUR = 18;
export const SLOT_MINUTES = 30;
export const SLOT_COUNT = ((MAX_HOUR - MIN_HOUR) * 60) / SLOT_MINUTES; // 22

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

const PERIOD_NOUN: Record<RhythmMode, string> = {
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

function unitsFor(mode: RhythmMode): string[] {
  if (mode === "weekly") return WEEKDAYS;
  if (mode === "monthly") return DAYS;
  return MONTHS;
}

/** Column index of a timestamp for the given mode (Copenhagen time), or null if not shown. */
export function getUnitIndex(ts: number, mode: RhythmMode): number | null {
  if (mode === "weekly") {
    const dow = getCphDayOfWeek(ts); // 0 = Sun
    return dow >= 1 && dow <= 5 ? dow - 1 : null;
  }
  const [, month, day] = formatCphDate(ts).split("-").map(Number);
  return mode === "monthly" ? day - 1 : month - 1;
}

/** Row index (30-min slot from 07:00) of a timestamp, or null if outside 07:00–18:00. */
export function getSlotIndex(ts: number): number | null {
  const secs = getCphSecondsSinceMidnight(ts) - MIN_HOUR * 3600;
  if (secs < 0) return null;
  const slot = Math.floor(secs / (SLOT_MINUTES * 60));
  return slot < SLOT_COUNT ? slot : null;
}

function periodKey(ts: number, mode: RhythmMode): string {
  if (mode === "weekly") {
    const { week, year } = getCphISOWeek(ts);
    return `${year}-W${week}`;
  }
  const date = formatCphDate(ts);
  return mode === "monthly" ? date.slice(0, 7) : date.slice(0, 4);
}

/** Pure bucketing of brew history into a unit × time-slot grid of big/small counts. */
export function bucketBrews(
  history: { timestamp: number; durationMs: number }[],
  mode: RhythmMode,
): RhythmBuckets {
  const units = unitsFor(mode);
  const grid: RhythmCell[][] = units.map(() =>
    Array.from({ length: SLOT_COUNT }, () => ({ big: 0, small: 0 })),
  );
  const periods = new Set<string>();

  for (const h of history) {
    periods.add(periodKey(h.timestamp, mode));
    const unitIdx = getUnitIndex(h.timestamp, mode);
    const slotIdx = getSlotIndex(h.timestamp);
    if (unitIdx === null || slotIdx === null) continue;
    const cell = grid[unitIdx][slotIdx];
    if (h.durationMs <= SMALL_BATCH_THRESHOLD_MS) cell.small++;
    else cell.big++;
  }

  return { units, grid, periods: periods.size };
}

export function cellCount(cell: RhythmCell, filter: BrewFilter): number {
  if (filter === "big") return cell.big;
  if (filter === "small") return cell.small;
  return cell.big + cell.small;
}

/**
 * Lower bounds of up to 4 shade bins, derived from the non-zero cell counts
 * (quartiles, forced strictly increasing). First bound is always 1.
 * Returns [] when there is no data.
 */
export function computeThresholds(counts: number[]): number[] {
  const values = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (values.length === 0) return [];
  const max = values[values.length - 1];
  const q = (p: number) =>
    values[Math.min(values.length - 1, Math.floor(p * values.length))];
  const bounds = [1];
  for (const p of [0.25, 0.5, 0.75]) {
    const next = Math.max(q(p), bounds[bounds.length - 1] + 1);
    if (next > max) break;
    bounds.push(next);
  }
  return bounds;
}

/** Shade level (0 = empty, 1..n) for a count given threshold lower bounds. */
export function levelFor(count: number, thresholds: number[]): number {
  let level = 0;
  thresholds.forEach((t, i) => {
    if (count >= t) level = i + 1;
  });
  return level;
}

// Sequential single-hue ramps (light -> dark on light surface; flipped in dark mode).
// Blue = all / big pot (app convention), amber = small pot.
const EMPTY_CELL = "bg-slate-100 dark:bg-slate-800/70";
const RAMPS: Record<"blue" | "amber", string[]> = {
  blue: [
    "bg-blue-200 dark:bg-blue-800",
    "bg-blue-400 dark:bg-blue-600",
    "bg-blue-600 dark:bg-blue-400",
    "bg-blue-800 dark:bg-blue-200",
  ],
  amber: [
    "bg-amber-200 dark:bg-amber-800",
    "bg-amber-400 dark:bg-amber-600",
    "bg-amber-600 dark:bg-amber-400",
    "bg-amber-800 dark:bg-amber-200",
  ],
};

/** Map a level to a ramp step so that fewer bins still span light -> dark. */
function shadeClass(
  level: number,
  binCount: number,
  filter: BrewFilter,
): string {
  if (level === 0) return EMPTY_CELL;
  const ramp = RAMPS[filter === "small" ? "amber" : "blue"];
  const step =
    binCount <= 1
      ? ramp.length - 1
      : Math.round(((level - 1) / (binCount - 1)) * (ramp.length - 1));
  return ramp[step];
}

function slotLabel(slotIdx: number): string {
  const start = MIN_HOUR * 60 + slotIdx * SLOT_MINUTES;
  const end = start + SLOT_MINUTES;
  const fmt = (m: number) =>
    `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  return `${fmt(start)}–${fmt(end)}`;
}

function hourLabel(h: number): string {
  if (h === 12) return "12PM";
  return h > 12 ? `${h - 12}PM` : `${h}AM`;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function formatAvg(n: number): string {
  return n >= 10 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, "");
}

const MODES: RhythmMode[] = ["weekly", "monthly", "yearly"];
const FILTERS: { value: BrewFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "big", label: "Big" },
  { value: "small", label: "Small" },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={(e) => {
            e.stopPropagation();
            onChange(o.value);
          }}
          className={cn(
            "px-3 md:px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
            value === o.value
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AggregateRhythm({
  history,
}: {
  history: { timestamp: number; durationMs: number }[];
}) {
  const [mode, setMode] = useState<RhythmMode>("weekly");
  const [filter, setFilter] = useState<BrewFilter>("all");
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [clickedKey, setClickedKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentHeaderRef = useRef<HTMLDivElement>(null);

  const { units, grid, periods } = useMemo(
    () => bucketBrews(history, mode),
    [history, mode],
  );

  const { thresholds, maxCount } = useMemo(() => {
    const counts = grid.flatMap((col) => col.map((c) => cellCount(c, filter)));
    return {
      thresholds: computeThresholds(counts),
      maxCount: Math.max(0, ...counts),
    };
  }, [grid, filter]);

  const [now] = useState(() => Date.now());
  const currentIdx = getUnitIndex(now, mode);

  // Changing mode/filter closes any open tooltip
  const changeMode = (m: RhythmMode) => {
    setMode(m);
    setClickedKey(null);
    setHoverKey(null);
  };
  const changeFilter = (f: BrewFilter) => {
    setFilter(f);
    setClickedKey(null);
    setHoverKey(null);
  };

  // On narrow screens (monthly scrolls horizontally), bring today's column into view
  useEffect(() => {
    const container = scrollRef.current;
    const header = currentHeaderRef.current;
    if (!container || !header || container.scrollWidth <= container.clientWidth)
      return;
    container.scrollLeft = header.offsetLeft - container.clientWidth / 2;
  }, [mode]);

  const activeKey = clickedKey ?? hoverKey;
  const binCount = thresholds.length;
  const noun = PERIOD_NOUN[mode];

  const legendBins = thresholds.map((t, i) => {
    const next = thresholds[i + 1];
    const upper = next !== undefined ? next - 1 : maxCount;
    return { level: i + 1, label: upper > t ? `${t}–${upper}` : String(t) };
  });

  return (
    <div
      className="w-full space-y-5 md:space-y-6"
      onClick={() => setClickedKey(null)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Brews per 30 min · 7 AM — 6 PM
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <Segmented
            ariaLabel="Time grouping"
            options={MODES.map((m) => ({ value: m, label: m }))}
            value={mode}
            onChange={changeMode}
          />
          <Segmented
            ariaLabel="Pot size"
            options={FILTERS}
            value={filter}
            onChange={changeFilter}
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto -mx-1 px-1 pb-2"
        onMouseLeave={() => setHoverKey(null)}
      >
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `2.75rem repeat(${units.length}, minmax(${mode === "weekly" ? "0" : "22px"}, 1fr))`,
          }}
          data-testid="rhythm-grid"
        >
          {/* Header row */}
          <div className="sticky left-0 z-10 bg-white dark:bg-slate-900" />
          {units.map((unit, idx) => (
            <div
              key={unit}
              ref={idx === currentIdx ? currentHeaderRef : undefined}
              aria-current={idx === currentIdx ? "date" : undefined}
              className={cn(
                "pb-1.5 text-center text-[11px] uppercase tracking-tight tabular-nums leading-none border-b-2",
                idx === currentIdx
                  ? "text-blue-600 dark:text-blue-400 font-black border-blue-500 dark:border-blue-400"
                  : "text-slate-500 dark:text-slate-400 font-bold border-transparent",
              )}
            >
              {unit}
            </div>
          ))}

          {/* Y-axis: one sticky column spanning all slot rows; labels sit on hour boundaries */}
          <div
            className="sticky left-0 z-10 bg-white dark:bg-slate-900 relative"
            style={{ gridColumn: 1, gridRow: `2 / span ${SLOT_COUNT}` }}
            aria-hidden="true"
          >
            {Array.from(
              { length: MAX_HOUR - MIN_HOUR + 1 },
              (_, i) => MIN_HOUR + i,
            ).map((h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] font-bold leading-none text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums"
                style={{
                  top: `${((h - MIN_HOUR) / (MAX_HOUR - MIN_HOUR)) * 100}%`,
                }}
              >
                {hourLabel(h)}
              </span>
            ))}
          </div>

          {/* Slot rows */}
          {Array.from({ length: SLOT_COUNT }, (_, slotIdx) =>
            units.map((unit, unitIdx) => {
              const cell = grid[unitIdx][slotIdx];
              const count = cellCount(cell, filter);
              const level = levelFor(count, thresholds);
              const key = `${unitIdx}-${slotIdx}`;
              const isActive = activeKey === key;
              const unitName = mode === "monthly" ? `Day ${unit}` : unit;
              const detail =
                filter === "all"
                  ? `${plural(count, "brew")} (${cell.big} big, ${cell.small} small)`
                  : plural(count, `${filter} brew`);
              const avg =
                periods > 1 && count > 0
                  ? `≈ ${formatAvg(count / periods)} per ${noun} · ${periods} ${noun}s`
                  : null;
              const colFrac = (unitIdx + 0.5) / units.length;
              const below = slotIdx < 4;

              return (
                <button
                  key={key}
                  type="button"
                  tabIndex={count > 0 ? 0 : -1}
                  aria-label={`${unitName} ${slotLabel(slotIdx)}: ${detail}`}
                  data-level={level}
                  data-count={count}
                  style={{ gridColumn: unitIdx + 2, gridRow: slotIdx + 2 }}
                  onMouseEnter={() => setHoverKey(key)}
                  onFocus={() => setHoverKey(key)}
                  onBlur={() => setHoverKey(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setClickedKey(clickedKey === key ? null : key);
                  }}
                  className={cn(
                    "relative h-4 md:h-5 rounded-[3px] transition-shadow focus:outline-none",
                    shadeClass(level, binCount, filter),
                    isActive && "ring-2 ring-slate-900 dark:ring-white z-20",
                    count === 0 ? "cursor-default" : "cursor-pointer",
                  )}
                >
                  {isActive && (
                    <span
                      role="tooltip"
                      className={cn(
                        "absolute z-30 pointer-events-none whitespace-nowrap px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-950 text-white shadow-2xl border border-white/10 flex flex-col items-start text-left",
                        below ? "top-full mt-2" : "bottom-full mb-2",
                        colFrac < 0.3
                          ? "left-0"
                          : colFrac > 0.7
                            ? "right-0"
                            : "left-1/2 -translate-x-1/2",
                      )}
                    >
                      <span className="text-[11px] font-bold text-slate-300 tabular-nums leading-tight">
                        {unitName} · {slotLabel(slotIdx)}
                      </span>
                      <span className="text-xs font-black leading-tight mt-0.5">
                        {detail}
                      </span>
                      {avg && (
                        <span className="text-[11px] font-medium text-slate-300 leading-tight mt-0.5">
                          {avg}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>

      {/* Legend + caption */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400"
          data-testid="rhythm-legend"
        >
          <span className="uppercase tracking-wider">
            {filter === "all"
              ? "Brews"
              : filter === "big"
                ? "Big brews"
                : "Small brews"}
          </span>
          <div className="flex items-end gap-[2px]">
            <div className="flex flex-col items-center gap-1">
              <div className={cn("w-7 h-3 rounded-[3px]", EMPTY_CELL)} />
              <span className="tabular-nums leading-none">0</span>
            </div>
            {legendBins.map((b) => (
              <div key={b.level} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-7 h-3 rounded-[3px]",
                    shadeClass(b.level, binCount, filter),
                  )}
                />
                <span className="tabular-nums leading-none whitespace-nowrap">
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          {history.length === 0
            ? "No brews recorded yet"
            : `Summed over ${plural(periods, noun)} · Copenhagen time`}
        </p>
      </div>
    </div>
  );
}
