"use client";

import { useState, useEffect } from "react";
 // Weight removed
import { format, eachDayOfInterval, isSameDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { SMALL_BATCH_GRAMS, BIG_BATCH_GRAMS, SMALL_BATCH_THRESHOLD_MS } from "@/lib/constants";

type ChartMode = "weekly" | "monthly" | "yearly";

interface CoffeeBurnChartProps {
  history: { timestamp: number; durationMs: number }[];
}

export function CoffeeBurnChart({ history }: CoffeeBurnChartProps) {
  const [mode, setMode] = useState<ChartMode>("weekly");
  const [clickedIdx, setClickedIdx] = useState<number | null>(null);
  const now = new Date();

  // Reset clicked index when mode changes
  useEffect(() => {
    setClickedIdx(null);
  }, [mode]);

  let labels: string[] = [];
  let data: number[] = [];
  let maxVal = 0;

  if (mode === "weekly") {
    // Last 7 days
    const days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i));
    labels = days.map(d => format(d, "EEE"));
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
    data = months.map(month => {
      return history
        .filter(h => isSameMonth(new Date(h.timestamp), month))
        .reduce((acc, h) => acc + (h.durationMs <= SMALL_BATCH_THRESHOLD_MS ? SMALL_BATCH_GRAMS : BIG_BATCH_GRAMS), 0);
    });
  }

  maxVal = Math.max(...data, 1000); // Minimum scale of 1kg

  return (
    <div className="w-full space-y-8" onClick={() => setClickedIdx(null)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Grams consumed {mode === "weekly" ? "last 7 days" : mode === "monthly" ? "this month" : "this year"}
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(["weekly", "monthly", "yearly"] as ChartMode[]).map((m) => (
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
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            {mode === "weekly" ? `Week ${format(now, "w")}` : mode === "monthly" ? format(now, "MMMM") : format(now, "yyyy")}
          </span>
        </div>
      </div>

      <div className="relative h-48 flex items-end gap-px md:gap-2 px-1 md:px-2">
        {data.map((val, i) => {
          const height = (val / maxVal) * 100;
          const isToday = mode === "weekly" && i === 6;

          return (
            <div 
              key={i} 
              className="flex-1 min-w-0 flex flex-col items-center gap-1 group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setClickedIdx(clickedIdx === i ? null : i);
              }}
            >
              <span className={cn(
                "text-[8px] md:text-[10px] font-black min-h-[16px] whitespace-nowrap transition-opacity",
                isToday ? "text-amber-600 dark:text-amber-500" : "text-slate-500 dark:text-slate-400",
                // Always show for weekly mode as there is plenty of space.
                // For Monthly/Yearly, hide by default to prevent overlap and show only on hover or if clicked.
                mode !== "weekly" && (clickedIdx === i ? "opacity-100" : "opacity-0 group-hover:opacity-100")
              )}>
                {val > 0 ? `${val}g` : ""}
              </span>
              <div className="relative w-full flex flex-col justify-end h-32">
                <div
                  className={cn(
                    "w-full rounded-t-[2px] md:rounded-t-lg transition-all duration-500 ease-out min-h-[2px] md:min-h-[4px]",
                    isToday ? "bg-amber-500" : (clickedIdx === i ? "bg-slate-400 dark:bg-slate-600" : "bg-slate-200 dark:bg-slate-800 group-hover:bg-slate-300 dark:group-hover:bg-slate-700")
                  )}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className={cn(
                "text-[8px] md:text-[9px] font-bold uppercase tracking-tighter",
                isToday ? "text-amber-600 dark:text-amber-500" : "text-slate-400 dark:text-slate-600"
              )}>
                {mode === "monthly" 
                  ? (parseInt(labels[i]) % 5 === 0 || i === 0 || i === data.length - 1 ? labels[i] : "") 
                  : labels[i]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              {data.reduce((a, b) => a + b, 0).toLocaleString()}g
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
