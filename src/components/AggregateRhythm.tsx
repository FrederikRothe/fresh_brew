"use client";

import { useState } from "react";
 // Clock removed
import { format, getDay, getDate, getMonth } from "date-fns";
import { cn } from "@/lib/utils";

type RhythmMode = "weekly" | "monthly" | "yearly";

interface ProcessedBrew {
  unitIdx: number;
  hour: number;
  isSmall: boolean;
  dateStr: string;
  timeStr: string;
  count: number;
  hasOther: boolean;
}

export function AggregateRhythm({
  history,
}: {
  history: { timestamp: number; durationMs: number }[];
}) {
  const [mode, setMode] = useState<RhythmMode>("weekly");

  const now = new Date();
  let currentIdx: number | null = null;

  if (mode === "weekly") {
    const day = getDay(now); // 0=Sun, 1=Mon...6=Sat
    if (day >= 1 && day <= 5) {
      currentIdx = day - 1;
    }
  } else if (mode === "monthly") {
    currentIdx = getDate(now) - 1;
  } else if (mode === "yearly") {
    currentIdx = getMonth(now);
  }

  const MIN_HOUR = 7;
  const MAX_HOUR = 18;
  const HOUR_RANGE = MAX_HOUR - MIN_HOUR;

  let units: string[] = [];
  let processedData: ProcessedBrew[] = [];

  // Group into 20-minute slots (0.33 hours) for aggregation
  const slotSize = 1 / 3;

  const aggregated = new Map<
    string,
    {
      unitIdx: number;
      hour: number;
      smallCount: number;
      bigCount: number;
    }
  >();

  const processHistory = (unitIdxCalc: (d: Date) => number | null) => {
    history.forEach((h) => {
      const d = new Date(h.timestamp);
      const unitIdx = unitIdxCalc(d);
      if (unitIdx === null) return;

      const hour = d.getHours() + Math.floor(d.getMinutes() / 20) * slotSize;
      const isSmall = h.durationMs < 5 * 60 * 1000;
      const key = `${unitIdx}-${hour.toFixed(2)}`;

      const existing = aggregated.get(key) || {
        unitIdx,
        hour,
        smallCount: 0,
        bigCount: 0,
      };
      if (isSmall) existing.smallCount++;
      else existing.bigCount++;
      aggregated.set(key, existing);
    });
  };

  if (mode === "weekly") {
    units = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    processHistory((d) => {
      const dayIdx = getDay(d);
      if (dayIdx === 0 || dayIdx === 6) return null;
      return dayIdx - 1;
    });
  } else if (mode === "monthly") {
    units = Array.from({ length: 31 }, (_, i) => String(i + 1));
    processHistory((d) => getDate(d) - 1);
  } else if (mode === "yearly") {
    units = [
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
    processHistory((d) => getMonth(d));
  }

  const validPoints = Array.from(aggregated.values())
    .filter((d) => d.hour >= MIN_HOUR && d.hour <= MAX_HOUR)
    .flatMap((a) => {
      const points = [];
      const timeStr = `${Math.floor(a.hour)}:${String(
        Math.round((a.hour % 1) * 60),
      ).padStart(2, "0")}`;

      if (a.bigCount > 0) {
        points.push({
          unitIdx: a.unitIdx,
          hour: a.hour,
          isSmall: false,
          count: a.bigCount,
          hasOther: a.smallCount > 0,
          dateStr: `${a.bigCount} big brew${a.bigCount > 1 ? "s" : ""}`,
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
          dateStr: `${a.smallCount} small brew${a.smallCount > 1 ? "s" : ""}`,
          timeStr,
        });
      }
      return points;
    });

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {mode === "yearly"
              ? "Density Map (7 AM — 6 PM)"
              : "Aggregate (7 AM — 6 PM)"}
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start">
          {(["weekly", "monthly", "yearly"] as RhythmMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                mode === m
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
            <span className="text-slate-500 dark:text-slate-400">
              {mode === "yearly" ? "Big Brew Intensity" : "Big Brew"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
            <span className="text-slate-500 dark:text-slate-400">
              {mode === "yearly" ? "Small Brew Intensity" : "Small Brew"}
            </span>
          </div>
        </div>
      </div>

      <div className="relative h-[500px] flex group pt-8">
        {/* Y-Axis Labels (Time) */}
        <div className="relative w-12 border-r border-slate-100 dark:border-slate-800">
          {[7, 8, 10, 12, 14, 16, 18].map((h) => (
            <span
              key={h}
              className="absolute right-3 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap"
              style={{ top: `${((h - MIN_HOUR) / HOUR_RANGE) * 100}%` }}
            >
              {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
            </span>
          ))}
        </div>

        {/* Swimlanes */}
        <div className="flex-1 flex relative">
          {/* Lane Backgrounds and Headers */}
          {units.map((unit, idx) => (
            <div
              key={idx}
              className={cn(
                "flex-1 relative border-r border-slate-50 dark:border-slate-900 last:border-r-0 group/lane transition-colors",
                idx === currentIdx && "bg-blue-50/20 dark:bg-blue-900/10",
              )}
            >
              <div className="absolute inset-0 bg-slate-50/0 group-hover/lane:bg-slate-50/50 dark:group-hover/lane:bg-slate-800/30 transition-colors" />
              <div
                className={cn(
                  "absolute -top-8 left-1/2 -translate-x-1/2 font-black uppercase tracking-tighter text-center transition-all",
                  mode === "monthly" ? "text-[8px]" : "text-[11px]",
                  idx === currentIdx
                    ? "text-blue-600 dark:text-blue-400 scale-110"
                    : "text-slate-400 dark:text-slate-600",
                )}
              >
                {unit}
              </div>
              {[7, 8, 10, 12, 14, 16, 18].map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-slate-100/50 dark:border-slate-800/50"
                  style={{ top: `${((h - MIN_HOUR) / HOUR_RANGE) * 100}%` }}
                />
              ))}
            </div>
          ))}

          {/* Dots Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            {validPoints.map((brew, i) => {
              const unitWidth = 100 / units.length;
              const xPos = (brew.unitIdx + 0.5) * unitWidth;
              const yPos = ((brew.hour - MIN_HOUR) / HOUR_RANGE) * 100;

              // Calculate size and opacity
              const count = brew.count || 1;
              const size = Math.min(8, 4 + Math.log2(count) * 2); // Slightly larger
              const opacity = Math.min(1, 0.6 + (count - 1) * 0.1); // Higher base opacity

              // Offset if both big and small brews exist in the same slot
              const xOffset = brew.hasOther ? (brew.isSmall ? 4 : -4) : 0;

              // Determine tooltip position based on which side of the chart we're on
              const isRightSide = brew.unitIdx > units.length / 2;

              return (
                <div
                  key={i}
                  className={cn(
                    "absolute rounded-full -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-150 cursor-pointer pointer-events-auto group/dot",
                    brew.isSmall
                      ? "bg-amber-400 hover:bg-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                      : "bg-blue-500 dark:bg-blue-400 hover:bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.25)]",
                    "ring-2 ring-white dark:ring-slate-800 z-10 hover:z-50",
                  )}
                  style={{
                    top: `${yPos}%`,
                    left: `calc(${xPos}% + ${xOffset}px)`,
                    width: `${size * 4}px`,
                    height: `${size * 4}px`,
                    opacity: opacity,
                  }}
                >
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl opacity-0 group-hover/dot:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl border border-white/10 flex items-center gap-2",
                      isRightSide
                        ? "right-full mr-2.5 group-hover/dot:-translate-x-1"
                        : "left-full ml-2.5 group-hover/dot:translate-x-1",
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        brew.isSmall ? "bg-amber-400" : "bg-blue-400",
                      )}
                    />
                    <div className="flex flex-col pr-1">
                      <span className="text-[10px] font-black leading-none uppercase tracking-tighter">
                        {brew.dateStr}
                      </span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                        {brew.timeStr}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest italic pt-4">
        &quot;Nothing like timing a fresh brew.&quot;
      </p>
    </div>
  );
}
