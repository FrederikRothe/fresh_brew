"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { format, getDay, getDate, getMonth } from "date-fns";
import { cn } from "@/lib/utils";

type RhythmMode = "weekly" | "monthly" | "yearly";

interface ProcessedBrew {
  unitIdx: number;
  hour: number;
  isSmall: boolean;
  dateStr: string;
  timeStr: string;
  jitter: number;
  count?: number;
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

  if (mode === "weekly") {
    units = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    processedData = history
      .map((h) => {
        const d = new Date(h.timestamp);
        let dayIdx = getDay(d); // 0=Sun, 1=Mon...6=Sat
        if (dayIdx === 0 || dayIdx === 6) return null;
        dayIdx = dayIdx - 1;
        const hour = d.getHours() + d.getMinutes() / 60;
        return {
          unitIdx: dayIdx,
          hour,
          isSmall: h.durationMs < 5 * 60 * 1000,
          dateStr: format(d, "MMM d, yyyy"),
          timeStr: format(d, "HH:mm"),
          jitter: 0,
        };
      })
      .filter((d): d is ProcessedBrew => d !== null);
  } else if (mode === "monthly") {
    units = Array.from({ length: 31 }, (_, i) => String(i + 1));
    processedData = history.map((h) => {
      const d = new Date(h.timestamp);
      const unitIdx = getDate(d) - 1;
      const hour = d.getHours() + d.getMinutes() / 60;
      return {
        unitIdx,
        hour,
        isSmall: h.durationMs < 5 * 60 * 1000,
        dateStr: format(d, "MMM d, yyyy"),
        timeStr: format(d, "HH:mm"),
        jitter: 0,
      };
    });
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

    // For yearly, we aggregate by month and hour-slot to avoid crowding
    const aggregated = new Map<
      string,
      { unitIdx: number; hour: number; isSmall: boolean; count: number }
    >();

    history.forEach((h) => {
      const d = new Date(h.timestamp);
      const unitIdx = getMonth(d);
      // Group into 20-minute slots (0.33 hours)
      const slotSize = 1 / 3;
      const hour = d.getHours() + Math.floor(d.getMinutes() / 20) * slotSize;
      const isSmall = h.durationMs < 5 * 60 * 1000;
      const key = `${unitIdx}-${hour}-${isSmall}`;

      const existing = aggregated.get(key);
      if (existing) {
        existing.count++;
      } else {
        aggregated.set(key, { unitIdx, hour, isSmall, count: 1 });
      }
    });

    processedData = Array.from(aggregated.values()).map((a) => ({
      unitIdx: a.unitIdx,
      hour: a.hour,
      isSmall: a.isSmall,
      count: a.count,
      dateStr: `${a.count} brew${a.count > 1 ? "s" : ""}`,
      timeStr: `${Math.floor(a.hour)}:${String(
        Math.round((a.hour % 1) * 60),
      ).padStart(2, "0")}`,
      jitter: 0,
    }));
  }

  // Filter out points out of hour range
  const validPoints = processedData.filter(
    (d) => d.hour >= MIN_HOUR && d.hour <= MAX_HOUR,
  );

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Consumption Rhythm
          </h3>
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
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500/60" />
            <span className="text-slate-500 dark:text-slate-400">
              {mode === "yearly" ? "Big Brew Intensity" : "Big Brew"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
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

              // Calculate size and opacity for yearly aggregate
              const isYearly = mode === "yearly";
              const count = brew.count || 1;
              const size = isYearly
                ? Math.min(6, 3 + Math.log2(count) * 1.5) // Grow slightly with count
                : mode === "monthly"
                  ? 1.5
                  : 3;

              const opacity = isYearly
                ? Math.min(1, 0.4 + (count - 1) * 0.15)
                : 0.6;

              return (
                <div
                  key={i}
                  className={cn(
                    "absolute rounded-full -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-150 cursor-pointer pointer-events-auto z-10",
                    brew.isSmall
                      ? "bg-amber-400 hover:bg-amber-500"
                      : "bg-blue-500 hover:bg-blue-600",
                    "ring-1 ring-white dark:ring-slate-900 shadow-sm",
                  )}
                  style={{
                    top: `${yPos}%`,
                    left: `${xPos}%`,
                    width: `${size * 4}px`,
                    height: `${size * 4}px`,
                    opacity: opacity,
                  }}
                  title={`${brew.dateStr} @ ${brew.timeStr}`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold py-1 px-2 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {brew.dateStr} @ {brew.timeStr}
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
