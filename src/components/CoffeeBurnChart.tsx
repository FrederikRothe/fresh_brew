"use client";

import { useState } from "react";
import { format, eachDayOfInterval, isSameDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { SMALL_BATCH_GRAMS, BIG_BATCH_GRAMS, SMALL_BATCH_THRESHOLD_MS } from "@/lib/constants";

type ChartMode = "weekly" | "monthly" | "yearly";

/** 680 -> "680g", 1360 -> "1.4kg" */
function formatGrams(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(1).replace(/\.0$/, "")}kg`;
  return `${val}g`;
}

interface CoffeeBurnChartProps {
  history: { timestamp: number; durationMs: number }[];
}

export function CoffeeBurnChart({ history }: CoffeeBurnChartProps) {
  const [mode, setMode] = useState<ChartMode>("weekly");
  const [clickedIdx, setClickedIdx] = useState<number | null>(null);
  const now = new Date();

  let labels: string[] = [];
  let data: number[] = [];
  // Index of the bar representing the current period (today / this month)
  let currentIdx = -1;
  let maxVal = 0;

  if (mode === "weekly") {
    // Last 7 days
    const days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i));
    labels = days.map(d => format(d, "EEE"));
    currentIdx = 6;
    data = days.map(day => {
      return history
        .filter(h => isSameDay(new Date(h.timestamp), day))
        .reduce((acc, h) => acc + (h.durationMs <= SMALL_BATCH_THRESHOLD_MS ? SMALL_BATCH_GRAMS : BIG_BATCH_GRAMS), 0);
    });
  } else if (mode === "monthly") {
    // Current month days
    const days = eachDayOfInterval({
      start: startOfMonth(now),
      end: endOfMonth(now),
    });
    labels = days.map(d => format(d, "d"));
    currentIdx = days.findIndex(d => isSameDay(d, now));
    data = days.map(day => {
      return history
        .filter(h => isSameDay(new Date(h.timestamp), day))
        .reduce((acc, h) => acc + (h.durationMs <= SMALL_BATCH_THRESHOLD_MS ? SMALL_BATCH_GRAMS : BIG_BATCH_GRAMS), 0);
    });
  } else if (mode === "yearly") {
    // Current year months
    const months = eachMonthOfInterval({
      start: startOfYear(now),
      end: endOfYear(now),
    });
    labels = months.map(m => format(m, "MMM"));
    currentIdx = months.findIndex(m => isSameMonth(m, now));
    data = months.map(month => {
      return history
        .filter(h => isSameMonth(new Date(h.timestamp), month))
        .reduce((acc, h) => acc + (h.durationMs <= SMALL_BATCH_THRESHOLD_MS ? SMALL_BATCH_GRAMS : BIG_BATCH_GRAMS), 0);
    });
  }

  maxVal = Math.max(...data, 1000); // Minimum scale of 1kg

  const total = data.reduce((a, b) => a + b, 0);
  const activeValues = data.filter(v => v > 0);
  const avg = activeValues.length > 0 ? Math.round(activeValues.reduce((a, b) => a + b, 0) / activeValues.length) : 0;
  const unit = mode === "yearly" ? "month" : "day";
  // Leave headroom above the tallest bar for its value label
  const toPct = (v: number) => (v / maxVal) * 85;

  const showXLabel = (i: number) => {
    if (mode !== "monthly") return true;
    if (i === currentIdx) return true;
    // Avoid collisions with the always-visible "today" label
    if (currentIdx >= 0 && Math.abs(i - currentIdx) <= 2) return false;
    const day = parseInt(labels[i]);
    return day === 1 || day % 5 === 0;
  };

  // Value labels: always visible when there is room, otherwise on hover/tap
  const valueLabelVisibility = (i: number) => {
    if (mode === "weekly" || clickedIdx === i || i === currentIdx) return "opacity-100";
    if (mode === "yearly") return "opacity-0 md:opacity-100 group-hover:opacity-100";
    return "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100";
  };

  return (
    <div className="w-full space-y-6" onClick={() => setClickedIdx(null)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Grams consumed {mode === "weekly" ? "in the last 7 days" : mode === "monthly" ? "this month" : "this year"}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {mode === "weekly" ? `Week ${format(now, "w")}` : mode === "monthly" ? format(now, "MMMM") : format(now, "yyyy")}
          </p>
        </div>

        <div className="flex self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl" role="group" aria-label="Time range">
          {(["weekly", "monthly", "yearly"] as ChartMode[]).map((m) => (
            <button
              key={m}
              onClick={(e) => {
                e.stopPropagation();
                setMode(m);
                setClickedIdx(null); // reset pinned bar when mode changes
              }}
              aria-pressed={mode === m}
              className={cn(
                "px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all",
                mode === m
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        {/* Plot area */}
        <div className="relative h-44 border-b border-slate-300 dark:border-slate-600" data-testid="burn-plot">
          {/* Average reference line */}
          {avg > 0 && (
            <div
              data-testid="burn-avg-line"
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-slate-400 dark:border-slate-500 pointer-events-none z-10"
              style={{ bottom: `${toPct(avg)}%` }}
            />
          )}

          <div className="absolute inset-0 flex items-end gap-0.5 md:gap-1.5 px-0.5 md:px-1">
            {data.map((val, i) => {
              const isCurrent = i === currentIdx;
              const isClicked = clickedIdx === i;
              return (
                <button
                  type="button"
                  key={i}
                  aria-label={`${labels[i]}: ${formatGrams(val)}`}
                  className="relative flex-1 min-w-0 h-full flex flex-col justify-end items-center group cursor-pointer focus-visible:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setClickedIdx(isClicked ? null : i);
                  }}
                >
                  <span
                    className={cn(
                      "absolute z-20 left-1/2 -translate-x-1/2 mb-1 text-xs font-bold tabular-nums whitespace-nowrap transition-opacity pointer-events-none",
                      isCurrent ? "text-amber-700 dark:text-amber-400" : "text-slate-700 dark:text-slate-200",
                      mode !== "weekly" && "bg-white/90 dark:bg-slate-900/90 px-1 rounded",
                      valueLabelVisibility(i),
                    )}
                    style={{ bottom: `${toPct(val)}%` }}
                  >
                    {val > 0 ? formatGrams(val) : ""}
                  </span>
                  <div
                    className={cn(
                      "w-full max-w-12 rounded-t-[3px] md:rounded-t-md transition-all duration-500 ease-out",
                      val > 0 ? "min-h-[3px]" : "min-h-0",
                      isCurrent
                        ? "bg-amber-600 dark:bg-amber-500"
                        : isClicked
                          ? "bg-blue-700 dark:bg-blue-300"
                          : "bg-blue-500 group-hover:bg-blue-600 dark:bg-blue-500 dark:group-hover:bg-blue-400",
                      "group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-focus-visible:ring-blue-500 dark:ring-offset-slate-900",
                    )}
                    style={{ height: `${toPct(val)}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex gap-0.5 md:gap-1.5 px-0.5 md:px-1 pt-2" aria-hidden>
          {labels.map((label, i) => {
            const isCurrent = i === currentIdx;
            return (
              <span
                key={i}
                className={cn(
                  "flex-1 min-w-0 min-h-[16px] flex items-center justify-center text-xs tabular-nums whitespace-nowrap overflow-visible",
                  isCurrent ? "font-bold text-amber-700 dark:text-amber-400" : "font-medium text-slate-500 dark:text-slate-400",
                )}
              >
                {showXLabel(i) ? label : ""}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</span>
          <span className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
            {total.toLocaleString("en-US")}g
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg / active {unit}</span>
          <span className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
            {avg > 0 ? formatGrams(avg) : "\u2014"}
          </span>
        </div>
        <div className="flex items-center gap-4 ml-auto text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-600 dark:bg-amber-500" />
            {mode === "yearly" ? "This month" : "Today"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-slate-500" />
            Average
          </span>
        </div>
      </div>
    </div>
  );
}
