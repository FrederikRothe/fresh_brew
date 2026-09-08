"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BurnChartData } from "@/lib/analytics";

export function CoffeeBurnChart({ data }: { data: BurnChartData }) {
  const [clickedIdx, setClickedIdx] = useState<number | null>(null);

  const labels = data.labels;
  const grams = data.grams;
  const maxVal = Math.max(...grams, 1000);
  const isEmpty = grams.every((g) => g === 0);
  const denseLabels = labels.length > 12;

  return (
    <div className="w-full space-y-8" onClick={() => setClickedIdx(null)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {data.caption}
          </p>
        </div>
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
          {data.periodLabel}
        </span>
      </div>

      {isEmpty ? (
        <div className="h-48 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
            No coffee burned in this period
          </p>
        </div>
      ) : (
        <div className="relative h-48 flex items-end gap-px md:gap-2 px-1 md:px-2">
          {grams.map((val, i) => {
            const height = (val / maxVal) * 100;
            const isCurrent = i === data.currentIdx;

            return (
              <div
                key={i}
                className="flex-1 min-w-0 flex flex-col items-center gap-1 group cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setClickedIdx(clickedIdx === i ? null : i);
                }}
              >
                <span
                  className={cn(
                    "text-[8px] md:text-[10px] font-black min-h-[16px] whitespace-nowrap transition-opacity",
                    isCurrent ? "text-amber-600 dark:text-amber-500" : "text-slate-500 dark:text-slate-400",
                    denseLabels && (clickedIdx === i ? "opacity-100" : "opacity-0 group-hover:opacity-100"),
                  )}
                >
                  {val > 0 ? `${val}g` : ""}
                </span>
                <div className="relative w-full flex flex-col justify-end h-32">
                  <div
                    className={cn(
                      "w-full rounded-t-[2px] md:rounded-t-lg transition-all duration-500 ease-out min-h-[2px] md:min-h-[4px]",
                      isCurrent
                        ? "bg-amber-500"
                        : clickedIdx === i
                          ? "bg-slate-400 dark:bg-slate-600"
                          : "bg-slate-200 dark:bg-slate-800 group-hover:bg-slate-300 dark:group-hover:bg-slate-700",
                    )}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[8px] md:text-[9px] font-bold uppercase tracking-tighter min-h-[16px] flex items-center justify-center",
                    isCurrent ? "text-amber-600 dark:text-amber-500" : "text-slate-400 dark:text-slate-600",
                  )}
                >
                  {denseLabels
                    ? parseInt(labels[i], 10) % 5 === 0 || i === 0 || i === grams.length - 1
                      ? labels[i]
                      : ""
                    : labels[i]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
        <div className="flex flex-col">
          <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Total
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
            {grams.reduce((a, b) => a + b, 0).toLocaleString()}g
          </span>
        </div>
      </div>
    </div>
  );
}
