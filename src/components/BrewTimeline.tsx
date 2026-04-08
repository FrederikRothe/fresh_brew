"use client";

import { useMemo, useEffect, useState } from "react";
import { 
  getCphDayOfWeek, 
  getCphSecondsSinceMidnight, 
  formatCphDate,
  formatCphTime 
} from "@/lib/utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Coffee, Info, Sparkles } from "lucide-react";

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
    <div className="bg-white dark:bg-slate-950/40 border-2 border-slate-200 dark:border-amber-900/30 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-amber-950/20">
      
      {/* 1. Prediction Banner Section */}
      {predictedNextBrew && (
        <div className="p-8 pb-6 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 dark:border-amber-900/10">
          <div className="flex items-center gap-5">
            <div className="bg-amber-500 rounded-2xl p-3.5 shadow-lg shadow-amber-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-tight text-2xl flex items-center justify-center md:justify-start gap-2">
                Next Brew Predicted
                <div className="group relative flex items-center">
                  <Info className="w-4 h-4 text-slate-300 dark:text-amber-500/40 cursor-help transition-colors group-hover:text-amber-500" />
                  <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 bottom-full mb-3 w-56 bg-white dark:bg-slate-950 text-slate-900 dark:text-amber-50 text-[10px] p-4 rounded-2xl font-bold normal-case tracking-tight shadow-2xl z-50 border border-slate-200 dark:border-amber-900/30">
                    <div className="relative">
                      Averaged from historical brew times for today&apos;s sequence (pot #{predictedNextBrew.sequenceIndex} on a {predictedNextBrew.dayName}).
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 md:left-2 md:translate-x-0 border-8 border-transparent border-t-white dark:border-t-slate-950" />
                    </div>
                  </div>
                </div>
              </h3>
              <p className="text-amber-600/60 dark:text-amber-500/60 text-[10px] font-black uppercase tracking-[0.2em]">
                Based on your typical {predictedNextBrew.dayName} rhythm
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <span className="text-7xl font-black text-amber-600 dark:text-amber-500 tabular-nums leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.2)] dark:drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              {predictedNextBrew.time}
            </span>
            <span className="text-[10px] font-black text-amber-600/40 dark:text-amber-500/40 uppercase tracking-[0.4em] mt-3">
              Estimated Time
            </span>
          </div>
        </div>
      )}

      {/* 2. Timeline Section */}
      <div className="p-8 pt-10">
        <div className="flex items-end justify-between mb-10">
          <div className="space-y-1">
            <h4 className="text-slate-900/90 dark:text-white font-black uppercase tracking-widest text-base">
              Daily Rhythm
            </h4>
            <p className="text-amber-600/30 dark:text-amber-500/30 text-[10px] font-black uppercase tracking-[0.2em]">
              Actual vs. Typical
            </p>
          </div>
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              <span className="text-slate-500 dark:text-white/40">Actual</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-amber-900/40 border border-slate-300 dark:border-amber-800/30" />
              <span className="text-slate-500 dark:text-white/40">Typical</span>
            </div>
          </div>
        </div>

        <div className="relative h-16 flex items-center mb-6">
          {/* Timeline Line */}
          <div className="absolute w-full h-1.5 bg-slate-100 dark:bg-amber-950/40 rounded-full border border-slate-200 dark:border-amber-900/10" />
          
          {/* Typical Markers */}
          {typicalBrews.map((b) => (
            <div
              key={`typical-${b.seqIndex}`}
              className="absolute -translate-x-1/2 group"
              style={{ left: `${getX(b.avgSeconds)}%` }}
            >
              <div className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-slate-300 dark:bg-amber-900/40 transition-transform group-hover:scale-125 shadow-sm" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-slate-900 dark:bg-amber-900 text-white dark:text-white text-[10px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl border border-slate-800 dark:border-amber-800/30">
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
              <div className="w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-transform group-hover:scale-110" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                <div className="bg-amber-500 text-white dark:text-slate-950 text-[10px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
                  Pot #{i + 1} @ {formatCphTime(b.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {/* You Are Here Indicator */}
          {currentSeconds >= MIN_SECONDS && currentSeconds <= MAX_SECONDS && (
            <div
              className="absolute -translate-x-1/2 h-20 flex flex-col items-center justify-center z-40 pointer-events-none"
              style={{ left: `${getX(currentSeconds)}%` }}
            >
              <div className="w-1 h-full bg-blue-500/40 rounded-full" />
              <div className="absolute top-0 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
              <div className="absolute bottom-0 whitespace-nowrap bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg translate-y-2">
                You Are Here
              </div>
            </div>
          )}
        </div>

        {/* Time Labels */}
        <div className="relative h-6 mt-10">
          {[7, 9, 11, 13, 15, 17, 19].map((h) => (
            <span 
              key={h} 
              className="absolute -translate-x-1/2 text-[10px] font-black text-slate-300 dark:text-amber-500/20 tabular-nums uppercase tracking-widest"
              style={{ left: `${getX(h * 3600)}%` }}
            >
              {h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Status Info Section */}
      <div className="p-8 py-6 bg-slate-50 dark:bg-amber-950/10 border-t border-slate-100 dark:border-amber-900/10">
        <div className="flex items-center gap-4">
          <div className="bg-slate-200 dark:bg-amber-900/30 p-2.5 rounded-xl border border-slate-300 dark:border-amber-800/20">
            <Info className="w-4 h-4 text-slate-500 dark:text-amber-500" />
          </div>
          <p className="text-[11px] font-bold text-slate-600 dark:text-white/60 leading-relaxed uppercase tracking-wider">
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
