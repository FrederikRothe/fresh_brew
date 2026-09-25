"use client";

import { useMemo, useEffect, useState } from "react";
import { 
  getCphDayOfWeek, 
  getCphSecondsSinceMidnight, 
  formatCphDate,
  formatCphTime 
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Info, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { SMALL_BATCH_THRESHOLD_MS } from "@/lib/constants";

const MIN_HOUR = 7;
const MAX_HOUR = 20;
const MIN_SECONDS = MIN_HOUR * 3600;
const MAX_SECONDS = MAX_HOUR * 3600;
const RANGE = MAX_SECONDS - MIN_SECONDS;
const HOURS = Array.from({ length: MAX_HOUR - MIN_HOUR + 1 }, (_, i) => MIN_HOUR + i);

interface BrewTimelineProps {
  history: { timestamp: number; durationMs: number }[];
  predictedNextBrew?: {
    time: string;
    sequenceIndex: number;
    dayName: string;
  } | null;
}

export function BrewTimeline({ history, predictedNextBrew }: BrewTimelineProps) {
  const [now, setNow] = useState(new Date());
  // Which marker tooltip is pinned open (tap/click support for touch devices)
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  // Update "current time" every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { todayBrews, typicalBrews, currentSeconds } = useMemo(() => {
    const todayStr = formatCphDate(now);
    const todayDayOfWeek = getCphDayOfWeek(now);
    const currentSeconds = getCphSecondsSinceMidnight(now);

    // Actual brews today
    const todayBrews = history
      .filter((h) => formatCphDate(h.timestamp) === todayStr)
      .map((h) => ({
        seconds: getCphSecondsSinceMidnight(h.timestamp),
        timestamp: h.timestamp,
        isSmall: h.durationMs <= SMALL_BATCH_THRESHOLD_MS,
      }))
      .sort((a, b) => a.seconds - b.seconds);

    // Typical brews for this day of the week
    const seqData: Record<number, { seconds: number[]; durations: number[] }> = {}; // seqIndex -> { seconds: [], durations: [] }
    
    // Group history by day of week and sequence index
    const historyByDay: Record<string, { timestamp: number; durationMs: number }[]> = {};
    history.forEach(h => {
      const dStr = formatCphDate(h.timestamp);
      if (!historyByDay[dStr]) historyByDay[dStr] = [];
      historyByDay[dStr].push(h);
    });

    Object.values(historyByDay).forEach(dayBrews => {
      const sorted = [...dayBrews].sort((a, b) => a.timestamp - b.timestamp);
      const d = new Date(sorted[0].timestamp);
      if (getCphDayOfWeek(d) === todayDayOfWeek) {
        sorted.forEach((h, idx) => {
          if (!seqData[idx]) seqData[idx] = { seconds: [], durations: [] };
          seqData[idx].seconds.push(getCphSecondsSinceMidnight(h.timestamp));
          seqData[idx].durations.push(h.durationMs);
        });
      }
    });

    const typicalBrews = Object.entries(seqData).map(([idx, data]) => {
      const avgSeconds = data.seconds.reduce((a, b) => a + b, 0) / data.seconds.length;
      const avgDuration = data.durations.reduce((a, b) => a + b, 0) / data.durations.length;
      const h = Math.floor(avgSeconds / 3600);
      const m = Math.floor((avgSeconds % 3600) / 60);
      const avgTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      return {
        seqIndex: parseInt(idx),
        avgSeconds,
        avgTime,
        isSmall: avgDuration <= SMALL_BATCH_THRESHOLD_MS,
        count: data.seconds.length,
      };
    }).sort((a, b) => a.avgSeconds - b.avgSeconds);

    return { todayBrews, typicalBrews, currentSeconds };
  }, [history, now]);

  const getX = (seconds: number) => {
    const pct = ((seconds - MIN_SECONDS) / RANGE) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  // Keep tooltips inside the card near the edges
  const tooltipAlign = (pct: number) =>
    pct < 15 ? "left-0" : pct > 85 ? "right-0" : "left-1/2 -translate-x-1/2";

  const weekdayShort = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Europe/Copenhagen" }).format(now);
  const nowInRange = currentSeconds >= MIN_SECONDS && currentSeconds <= MAX_SECONDS;

  const toggle = (key: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveKey((k) => (k === key ? null : key));
  };

  const tooltipVisibility = (key: string) =>
    activeKey === key
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100";

  return (
    <section
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm"
      onClick={() => {
        setActiveKey(null);
        setInfoOpen(false);
      }}
    >
      {/* 1. Prediction Banner Section */}
      {predictedNextBrew && (
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500 rounded-2xl p-3 shadow-md shadow-amber-500/20 shrink-0">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="space-y-1">
              <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-tight text-lg md:text-2xl flex items-center gap-2">
                Next Brew Predicted
                <span className="relative flex items-center">
                  <button
                    type="button"
                    aria-label="How is this predicted?"
                    aria-expanded={infoOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoOpen((o) => !o);
                    }}
                    className="peer p-1 -m-1 rounded-full text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <span
                    role="tooltip"
                    className={cn(
                      "absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-60 max-w-[calc(100vw-3rem)] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 text-sm leading-snug p-3 rounded-xl font-medium normal-case tracking-normal shadow-xl z-50 border border-slate-200 dark:border-slate-700 transition-opacity",
                      infoOpen ? "visible opacity-100" : "invisible opacity-0 peer-hover:visible peer-hover:opacity-100 peer-focus-visible:visible peer-focus-visible:opacity-100",
                    )}
                  >
                    Averaged from historical brew times for today&apos;s sequence (pot #{predictedNextBrew.sequenceIndex} on a {predictedNextBrew.dayName}).
                  </span>
                </span>
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold">
                Based on your typical {predictedNextBrew.dayName} rhythm
              </p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center sm:items-end"
          >
            <span className="text-5xl md:text-6xl font-black text-amber-600 dark:text-amber-400 tabular-nums leading-none tracking-tight">
              {predictedNextBrew.time}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-2">
              Estimated time
            </span>
          </motion.div>
        </div>
      )}

      {/* 2. Timeline Section */}
      <div className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div className="space-y-0.5">
            <h4 className="text-slate-900 dark:text-white font-black uppercase tracking-tight text-base md:text-lg">
              Daily Rhythm
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              Today vs. a typical {weekdayShort}
            </p>
          </div>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300" aria-label="Legend">
            <li className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" /> Big pot
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-600" /> Small pot
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-slate-500 dark:border-slate-400" /> Typical (avg.)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-0.5 h-3.5 bg-rose-600 dark:bg-rose-400 rounded-full" /> Now
            </li>
          </ul>
        </div>

        <div className="flex" data-testid="timeline-container">
          {/* Row labels */}
          <div className="w-16 sm:w-24 shrink-0 pt-7 flex flex-col text-xs sm:text-sm font-bold">
            <div data-testid="track-label-actual" className="h-12 flex items-center text-slate-900 dark:text-slate-100">
              Today
            </div>
            <div data-testid="track-label-typical" className="h-12 flex items-center text-slate-600 dark:text-slate-400">
              Typical {weekdayShort}
            </div>
          </div>

          {/* Plot */}
          <div className="relative flex-1 min-w-0 pr-3">
            <div className="relative pt-7">
              <div className="relative h-24 mx-2">
                {/* Hour gridlines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-slate-100 dark:bg-slate-800"
                    style={{ left: `${getX(h * 3600)}%` }}
                  />
                ))}

                {/* Row baselines */}
                <div aria-hidden className="absolute top-6 inset-x-0 h-0.5 -translate-y-1/2 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div aria-hidden className="absolute top-[4.5rem] inset-x-0 h-0.5 -translate-y-1/2 bg-slate-200 dark:bg-slate-700 rounded-full" />

                {/* Now indicator */}
                {nowInRange && (
                  <div
                    data-testid="now-indicator"
                    className="absolute -top-7 bottom-0 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none"
                    style={{ left: `${getX(currentSeconds)}%` }}
                  >
                    <span className="whitespace-nowrap bg-rose-600 dark:bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full tabular-nums">
                      Now {formatCphTime(now)}
                    </span>
                    <span className="flex-1 w-0.5 bg-rose-600 dark:bg-rose-400 rounded-full" />
                  </div>
                )}

                {/* Actual Markers (Today row) */}
                {todayBrews.map((b, i) => {
                  const key = `actual-${i}`;
                  const x = getX(b.seconds);
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={toggle(key)}
                      aria-label={`Pot ${i + 1} at ${formatCphTime(b.timestamp)}, ${b.isSmall ? "small" : "big"}`}
                      className="group absolute top-6 -translate-x-1/2 -translate-y-1/2 p-2 z-20 cursor-pointer focus-visible:outline-none"
                      style={{ left: `${x}%` }}
                    >
                      <span className={cn(
                        "block w-4 h-4 rounded-full ring-2 ring-white dark:ring-slate-900 transition-transform group-hover:scale-125 group-focus-visible:scale-125",
                        b.isSmall ? "bg-amber-600" : "bg-blue-500",
                      )} />
                      <span className={cn("absolute bottom-full mb-1 pointer-events-none transition-opacity z-40", tooltipAlign(x), tooltipVisibility(key))}>
                        <span className="block bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                          Pot #{i + 1} @ {formatCphTime(b.timestamp)} ({b.isSmall ? "Small" : "Big"})
                        </span>
                      </span>
                    </button>
                  );
                })}

                {/* Typical Markers (Typical row) */}
                {typicalBrews.map((b) => {
                  const key = `typical-${b.seqIndex}`;
                  const x = getX(b.avgSeconds);
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={toggle(key)}
                      aria-label={`Typical pot ${b.seqIndex + 1} around ${b.avgTime}, ${b.isSmall ? "small" : "big"}`}
                      className="group absolute top-[4.5rem] -translate-x-1/2 -translate-y-1/2 p-2 z-10 cursor-pointer focus-visible:outline-none"
                      style={{ left: `${x}%` }}
                    >
                      <span className={cn(
                        "block w-4 h-4 rounded-full border-[3px] bg-white dark:bg-slate-900 transition-transform group-hover:scale-125 group-focus-visible:scale-125",
                        b.isSmall ? "border-amber-600" : "border-blue-500",
                      )} />
                      <span className={cn("absolute top-full mt-1 pointer-events-none transition-opacity z-40", tooltipAlign(x), tooltipVisibility(key))}>
                        <span className="block bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                          Typical Pot #{b.seqIndex + 1} - {b.avgTime} ({b.isSmall ? "Small" : "Big"})
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time axis */}
            <div className="relative h-5 mt-2 mx-2" aria-hidden>
              {HOURS.map((h) => (
                <span
                  key={h}
                  className={cn(
                    "absolute -translate-x-1/2 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap",
                    // phone: every 3h, tablet: every 2h, desktop: every hour
                    h % 3 !== 0 && "hidden",
                    h % 2 === 0 ? "sm:inline" : "sm:hidden",
                    "md:inline",
                  )}
                  style={{ left: `${getX(h * 3600)}%` }}
                >
                  {`${h.toString().padStart(2, "0")}:00`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Status Info Section */}
      <div className="px-6 md:px-8 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Info className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
            {todayBrews.length > 0 ? (
              typicalBrews.length >= todayBrews.length ? (
                <>
                  You&apos;re currently on Pot #{todayBrews.length}.
                  {typicalBrews[todayBrews.length - 1].avgSeconds > todayBrews[todayBrews.length - 1].seconds
                    ? " You're running slightly early today!"
                    : " You're right on schedule with your typical rhythm."}
                </>
              ) : (
                "You're exceeding your typical daily sequence!"
              )
            ) : (
              "Haven't started your first brew yet today. Get those beans ready!"
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
