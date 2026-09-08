"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { RhythmChartData, RhythmPoint } from "@/lib/analytics";

export function AggregateRhythm({
  data,
}: {
  data: RhythmChartData;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [clickedIdx, setClickedIdx] = useState<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const MIN_HOUR = 7;
  const MAX_HOUR = 18;
  const HOUR_RANGE = MAX_HOUR - MIN_HOUR;
  const units = data.units;
  const currentIdx = data.currentIdx;
  const validPoints: RhythmPoint[] = data.points;
  const isMonthly = units.length > 12;
  const isEmpty = validPoints.length === 0;

  return (
    <div className="w-full space-y-6 md:space-y-8" onClick={() => setClickedIdx(null)}>
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Density map (7 AM — 6 PM, Copenhagen)
        </p>
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-600">
          {data.caption}
        </p>
      </div>

      <div className="flex items-center gap-3 md:gap-4 text-[8px] md:text-[9px] font-bold uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">Big</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">Small</span>
        </div>
      </div>

      {isEmpty ? (
        <div className="h-[200px] md:h-[240px] flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 text-center px-6">
            No brews in this view
          </p>
        </div>
      ) : (
        <div className="relative h-[400px] md:h-[500px] flex group pt-8">
          <div className="relative w-10 md:w-12 border-r border-slate-100 dark:border-slate-800">
            {[7, 8, 10, 12, 14, 16, 18].map((h) => (
              <span
                key={h}
                className="absolute right-2 md:right-3 -translate-y-1/2 text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap"
                style={{ top: `${((h - MIN_HOUR) / HOUR_RANGE) * 100}%` }}
              >
                {h === 12 ? "12PM" : h > 12 ? `${h - 12}PM` : `${h}AM`}
              </span>
            ))}
          </div>

          <div className="flex-1 flex relative">
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
                    isMonthly ? "text-[8px]" : "text-[11px]",
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

            <div className="absolute inset-0 pointer-events-none overflow-visible">
              {validPoints.map((brew, i) => {
                const unitWidth = 100 / units.length;
                const xPos = (brew.unitIdx + 0.5) * unitWidth;
                const yPos = ((brew.hour - MIN_HOUR) / HOUR_RANGE) * 100;
                const count = brew.count || 1;
                const baseSize = isMobile ? 3 : 4;
                const size = Math.min(8, baseSize + Math.log2(count) * 2);
                const opacity = Math.min(1, 0.6 + (count - 1) * 0.1);
                const xOffset = brew.hasOther ? (brew.isSmall ? 4 : -4) : 0;
                const isRightSide = brew.unitIdx > units.length / 2;

                return (
                  <div
                    key={i}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer pointer-events-auto group/dot z-10 transition-transform",
                      clickedIdx === i ? "z-50 scale-125" : "hover:z-50",
                    )}
                    style={{
                      top: `${yPos}%`,
                      left: `calc(${xPos}% + ${xOffset}px)`,
                      width: `${size * (isMobile ? 3 : 4)}px`,
                      height: `${size * (isMobile ? 3 : 4)}px`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setClickedIdx(clickedIdx === i ? null : i);
                    }}
                  >
                    <div
                      className={cn(
                        "w-full h-full rounded-full transition-all group-hover/dot:scale-150",
                        brew.isSmall
                          ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                          : "bg-blue-500 dark:bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)]",
                        "ring-2 ring-white dark:ring-slate-800",
                        clickedIdx === i && "ring-blue-500 dark:ring-blue-400 scale-150",
                      )}
                      style={{ opacity }}
                    />

                    <div
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-950 text-white rounded-xl transition-all duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl border border-white/10 flex items-center gap-2",
                        isRightSide
                          ? "right-full mr-3 group-hover/dot:-translate-x-1"
                          : "left-full ml-3 group-hover/dot:translate-x-1",
                        clickedIdx === i
                          ? isRightSide
                            ? "opacity-100 -translate-x-1"
                            : "opacity-100 translate-x-1"
                          : "opacity-0 group-hover/dot:opacity-100",
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
                        <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-1">
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
      )}

      <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest italic pt-4">
        &quot;Nothing like timing a fresh brew.&quot;
      </p>
    </div>
  );
}
