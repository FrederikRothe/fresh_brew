"use client";

import { useMemo, useEffect, useState } from "react";
import { 
  getCphDayOfWeek, 
  getCphSecondsSinceMidnight, 
  formatCphDate,
  formatCphTime 
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Coffee, Info, Sparkles } from "lucide-react";

interface BrewTimelineProps {
  history: { timestamp: number; durationMs: number }[];
}

export function BrewTimeline({ history }: BrewTimelineProps) {
  const [now, setNow] = useState(new Date());

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
        isSmall: h.durationMs < 5 * 60 * 1000,
      }))
      .sort((a, b) => a.seconds - b.seconds);

    // Typical brews for this day of the week
    const seqData: Record<number, number[]> = {}; // seqIndex -> [secondsSinceMidnight]
    
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
          if (!seqData[idx]) seqData[idx] = [];
          seqData[idx].push(getCphSecondsSinceMidnight(h.timestamp));
        });
      }
    });

    const typicalBrews = Object.entries(seqData).map(([idx, times]) => ({
      seqIndex: parseInt(idx),
      avgSeconds: times.reduce((a, b) => a + b, 0) / times.length,
      count: times.length,
    })).sort((a, b) => a.avgSeconds - b.avgSeconds);

    return { todayBrews, typicalBrews, currentSeconds };
  }, [history, now]);

  const MIN_SECONDS = 7 * 3600; // 7 AM
  const MAX_SECONDS = 20 * 3600; // 8 PM
  const RANGE = MAX_SECONDS - MIN_SECONDS;

  const getX = (seconds: number) => {
    const pct = ((seconds - MIN_SECONDS) / RANGE) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200/50 dark:border-amber-800/30 rounded-3xl p-6 shadow-xl shadow-amber-500/5 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 rounded-2xl p-2.5 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-amber-900 dark:text-amber-100 font-black uppercase tracking-tight text-lg">
              Daily Rhythm
            </h4>
            <p className="text-amber-700/70 dark:text-amber-400/70 text-[10px] font-bold uppercase tracking-widest">
              Actual vs. Typical Sequence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-600 dark:bg-amber-500" />
            <span className="text-amber-800/60 dark:text-amber-200/60">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-200 dark:bg-amber-800/50" />
            <span className="text-amber-800/60 dark:text-amber-200/60">Typical</span>
          </div>
        </div>
      </div>

      <div className="relative h-14 flex items-center mb-4">
        {/* Timeline Line */}
        <div className="absolute w-full h-1.5 bg-amber-200/30 dark:bg-amber-900/20 rounded-full" />
        
        {/* Typical Markers (Greyed out) */}
        {typicalBrews.map((b) => (
          <div
            key={`typical-${b.seqIndex}`}
            className="absolute -translate-x-1/2 group"
            style={{ left: `${getX(b.avgSeconds)}%` }}
          >
            <div className="w-4 h-4 rounded-full border-2 border-amber-50 dark:border-slate-900 bg-amber-200 dark:bg-amber-800/50 transition-transform group-hover:scale-125 shadow-sm" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[9px] font-black px-2 py-1 rounded-md whitespace-nowrap shadow-xl">
                Typical Pot #{b.seqIndex + 1}
              </div>
            </div>
          </div>
        ))}

        {/* Actual Markers */}
        {todayBrews.map((b, i) => (
          <div
            key={`actual-${i}`}
            className="absolute -translate-x-1/2 group z-20"
            style={{ left: `${getX(b.seconds)}%` }}
          >
            <div className="w-5 h-5 rounded-full border-2 border-amber-50 dark:border-slate-900 bg-amber-600 dark:bg-amber-500 shadow-lg shadow-amber-500/30 transition-transform group-hover:scale-110" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
              <div className="bg-amber-600 text-white text-[10px] font-black px-2 py-1 rounded-md whitespace-nowrap shadow-xl">
                Pot #{i + 1} @ {formatCphTime(b.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* You Are Here Indicator */}
        {currentSeconds >= MIN_SECONDS && currentSeconds <= MAX_SECONDS && (
          <div
            className="absolute -translate-x-1/2 h-full flex flex-col items-center justify-center z-40 pointer-events-none"
            style={{ left: `${getX(currentSeconds)}%` }}
          >
            <div className="w-1 h-full bg-rose-500/30 rounded-full" />
            <div className="absolute -top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
            <div className="absolute -bottom-6 whitespace-nowrap">
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">
                You Are Here
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Time Labels - Positioned Absolutely to match the getX logic */}
      <div className="relative h-6 mt-4">
        {[7, 9, 11, 13, 15, 17, 19].map((h) => (
          <span 
            key={h} 
            className="absolute -translate-x-1/2 text-[10px] font-bold text-amber-800/40 dark:text-amber-200/30 tabular-nums uppercase"
            style={{ left: `${getX(h * 3600)}%` }}
          >
            {h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`}
          </span>
        ))}
      </div>

      {/* Track info */}
      <div className="mt-8 pt-6 border-t border-amber-200/30 dark:border-amber-800/20">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100/50 dark:bg-amber-900/30 p-2 rounded-xl">
            <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
          </div>
          <p className="text-[10px] font-bold text-amber-800/60 dark:text-amber-200/60 leading-relaxed max-w-[80%]">
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
    </div>
  );
}
