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
import { motion, AnimatePresence } from "framer-motion";
import { SMALL_BATCH_THRESHOLD_MS } from "@/lib/constants";

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
  const [isHovered, setIsHovered] = useState(false);

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

  const MIN_SECONDS = 7 * 3600; // 7 AM
  const MAX_SECONDS = 20 * 3600; // 8 PM
  const RANGE = MAX_SECONDS - MIN_SECONDS;

  const getX = (seconds: number) => {
    const pct = ((seconds - MIN_SECONDS) / RANGE) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  return (
    <div className="bg-white dark:bg-slate-950/40 netlight:bg-black/40 border-2 border-slate-200 dark:border-amber-900/30 netlight:border-nl-purple-d/20 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-amber-950/20 netlight:shadow-none">
      
      {/* 1. Prediction Banner Section */}
      {predictedNextBrew && (
        <div className="p-6 md:p-8 pb-6 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 dark:border-amber-900/10 netlight:border-nl-purple-d/10">
          <div className="flex items-center gap-5">
            <div className="bg-amber-500 netlight:bg-nl-yellow rounded-2xl p-3 md:p-3.5 shadow-lg shadow-amber-500/20 netlight:shadow-nl-yellow/10">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white netlight:text-nl-purple-d" />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-slate-900 dark:text-white netlight:text-white font-black uppercase tracking-tight text-xl md:text-2xl flex items-center justify-center md:justify-start gap-2">
                Next Brew Predicted
                <div className="group relative flex items-center">
                  <Info className="w-4 h-4 text-slate-300 dark:text-amber-500/40 netlight:text-nl-purple-l/40 cursor-help transition-colors group-hover:text-amber-500 netlight:group-hover:text-nl-purple" />
                  <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 bottom-full mb-3 w-56 bg-white dark:bg-slate-950 netlight:bg-slate-900 text-slate-900 dark:text-amber-50 netlight:text-white text-[10px] p-4 rounded-2xl font-bold normal-case tracking-tight shadow-2xl z-50 border border-slate-200 dark:border-amber-900/30 netlight:border-nl-purple/20">
                    <div className="relative">
                      Averaged from historical brew times for today&apos;s sequence (pot #{predictedNextBrew.sequenceIndex} on a {predictedNextBrew.dayName}).
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 md:left-2 md:translate-x-0 border-8 border-transparent border-t-white dark:border-t-slate-950 netlight:border-t-slate-900" />
                    </div>
                  </div>
                </div>
              </h3>
              <p className="text-amber-600/60 dark:text-amber-500/60 netlight:text-nl-purple-l/40 text-[10px] font-black uppercase tracking-[0.2em]">
                Based on your typical {predictedNextBrew.dayName} rhythm
              </p>
            </div>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center md:items-end"
          >
            <span className="text-5xl md:text-7xl font-black text-amber-600 dark:text-amber-500 netlight:text-nl-yellow tabular-nums leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.2)] dark:drop-shadow-[0_0_15px_rgba(245,158,11,0.3)] netlight:drop-shadow-none">
              {predictedNextBrew.time}
            </span>
            <span className="text-[10px] font-black text-amber-600/40 dark:text-amber-500/40 netlight:text-nl-purple/40 uppercase tracking-[0.4em] mt-3">
              Estimated Time
            </span>
          </motion.div>
        </div>
      )}

      {/* 2. Timeline Section */}
      <div className="p-6 md:p-8 pt-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-0 mb-10 px-1 md:px-0">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-slate-900/90 dark:text-white netlight:text-white font-black uppercase tracking-widest text-base">
              Daily Rhythm
            </h4>
            <p className="text-amber-600/40 dark:text-amber-500/40 netlight:text-nl-purple-l/40 text-[10px] font-black uppercase tracking-[0.2em]">
              Actual vs. Typical
            </p>
          </div>
          <div className="flex items-center justify-center md:justify-end gap-6 md:gap-8 text-[10px] font-black uppercase tracking-[0.2em] pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-amber-500 netlight:bg-nl-yellow shadow-[0_0_10px_rgba(245,158,11,0.5)] netlight:shadow-none" />
              <span className="text-slate-500 dark:text-white/40 netlight:text-nl-purple-l/60">Actual</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-amber-900/40 netlight:bg-nl-purple-d/30 border border-slate-300 dark:border-amber-800/30 netlight:border-nl-purple/20" />
              <span className="text-slate-500 dark:text-white/40 netlight:text-nl-purple-l/60">Typical</span>
            </div>
          </div>
        </div>

        <div 
          className="relative h-24 flex items-center mb-6 px-4 md:px-12"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          data-testid="timeline-container"
        >
          {/* Timeline Lines */}
          <div className="absolute left-4 md:left-12 right-4 md:right-12 h-full flex flex-col justify-center">
            {/* Typical Line */}
            <motion.div 
              animate={{ 
                y: isHovered ? 20 : 0,
                opacity: isHovered ? 0.6 : 1,
                scaleY: isHovered ? 0.5 : 1
              }}
              className="absolute w-full h-1.5 bg-slate-100 dark:bg-amber-950/40 netlight:bg-nl-purple-l rounded-full border border-slate-200 dark:border-amber-900/10 netlight:border-nl-purple/10" 
            />
            {/* Actual Line */}
            <motion.div 
              animate={{ 
                y: isHovered ? -20 : 0,
              }}
              className={cn(
                "absolute w-full h-1.5 rounded-full border transition-colors duration-300",
                isHovered 
                  ? "bg-amber-500/20 border-amber-500/30 netlight:bg-nl-yellow/20 netlight:border-nl-yellow/30" 
                  : "bg-slate-100 dark:bg-amber-950/40 netlight:bg-nl-beige border-slate-200 dark:border-amber-900/10 netlight:border-nl-purple/10"
              )}
            />
          </div>

          {/* Track Labels */}
          <AnimatePresence>
            {isHovered && (
              <>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  data-testid="track-label-actual"
                  className="absolute left-0 -translate-y-[20px] text-[8px] font-black uppercase text-amber-500 netlight:text-nl-yellow tracking-tighter"
                >
                  Actual
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  data-testid="track-label-typical"
                  className="absolute left-0 translate-y-[20px] text-[8px] font-black uppercase text-slate-400 netlight:text-nl-purple-l tracking-tighter"
                >
                  Typical
                </motion.div>
              </>
            )}
          </AnimatePresence>
          
          <div className="relative w-full h-full flex items-center">
            {/* Typical Markers */}
            {typicalBrews.map((b) => (
              <motion.div
                key={`typical-${b.seqIndex}`}
                className="absolute -translate-x-1/2 group cursor-pointer"
                style={{ left: `${getX(b.avgSeconds)}%` }}
                animate={{ y: isHovered ? 20 : 0 }}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 netlight:border-nl-purple-d transition-transform group-hover:scale-125 shadow-sm",
                  b.isSmall 
                    ? "bg-amber-400/60 dark:bg-amber-600/40 netlight:bg-nl-yellow/40" 
                    : "bg-blue-500/60 dark:bg-blue-600/40 netlight:bg-nl-purple/40"
                )} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className={cn(
                    "text-white text-[10px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl border",
                    b.isSmall
                      ? "bg-amber-600 dark:bg-amber-900 netlight:bg-nl-yellow netlight:text-nl-purple-d border-amber-500/30 netlight:border-nl-yellow/20"
                      : "bg-blue-600 dark:bg-blue-900 netlight:bg-nl-purple border-blue-500/30 netlight:border-nl-purple/20"
                  )}>
                    Typical Pot #{b.seqIndex + 1} - {b.avgTime} ({b.isSmall ? 'Small' : 'Big'})
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Actual Markers */}
            {todayBrews.map((b, i) => (
              <motion.div
                key={`actual-${i}`}
                className="absolute -translate-x-1/2 group z-20 cursor-pointer"
                style={{ left: `${getX(b.seconds)}%` }}
                animate={{ y: isHovered ? -20 : 0 }}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 netlight:border-nl-purple shadow-lg netlight:shadow-none transition-transform group-hover:scale-110",
                  b.isSmall 
                    ? "bg-amber-400 shadow-amber-400/40 netlight:bg-nl-yellow" 
                    : "bg-blue-500 shadow-blue-500/40 netlight:bg-nl-white"
                )} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                  <div className={cn(
                    "text-white text-[10px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl",
                    b.isSmall ? "bg-amber-500 netlight:bg-nl-yellow netlight:text-nl-purple-d" : "bg-blue-500 netlight:bg-nl-purple"
                  )}>
                    Pot #{i + 1} @ {formatCphTime(b.timestamp)} ({b.isSmall ? 'Small' : 'Big'})
                  </div>
                </div>
              </motion.div>
            ))}

            {/* You Are Here Indicator */}
            {currentSeconds >= MIN_SECONDS && currentSeconds <= MAX_SECONDS && (
              <motion.div
                className="absolute -translate-x-1/2 flex flex-col items-center z-40 pointer-events-none"
                style={{ left: `${getX(currentSeconds)}%` }}
                animate={{ y: isHovered ? -20 : 0 }}
              >
                {/* Text and Line positioned above the dot */}
                <div className="absolute bottom-full flex flex-col items-center">
                  <div className="whitespace-nowrap bg-blue-500 netlight:bg-nl-yellow text-white netlight:text-nl-purple-d text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg mb-2">
                    You Are Here
                  </div>
                  <div className="w-1 h-12 bg-blue-500/40 netlight:bg-nl-yellow/40 rounded-full" />
                </div>
                {/* The Dot: centered on the timeline line */}
                <div className="w-3 h-3 rounded-full bg-blue-500 netlight:bg-nl-yellow ring-4 ring-blue-500/20 netlight:ring-nl-yellow/20 shadow-[0_0_15px_rgba(59,130,246,0.6)] netlight:shadow-none relative z-10" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Time Labels */}
        <div className="relative h-6 mt-10 px-4 md:px-12">
          <div className="relative w-full">
            {[7, 9, 11, 13, 15, 17, 19].map((h) => (
              <span 
                key={h} 
                className="absolute -translate-x-1/2 text-[10px] font-black text-slate-300 dark:text-amber-500/20 tabular-nums uppercase tracking-widest whitespace-nowrap"
                style={{ left: `${getX(h * 3600)}%` }}
              >
                {h > 12 ? `${h - 12}PM` : h === 12 ? "12PM" : `${h}AM`}
              </span>
            ))}
          </div>
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
