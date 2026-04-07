"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrewAnalytics, BrewAnalytics } from "@/app/actions";
import { Coffee, ArrowLeft, BarChart2, Calendar, Clock, Coffee as CoffeeIcon, LayoutGrid, Weight, Sparkles, Droplets, Zap, Hourglass, Info } from "lucide-react";
import { formatCphDate } from "@/lib/utils";
import { StatTile } from "@/components/StatTile";
import { AggregateRhythm } from "@/components/AggregateRhythm";
import { CoffeeBurnChart } from "@/components/CoffeeBurnChart";
import { CollapsibleSection } from "@/components/CollapsibleSection";

export default function AnalyzePage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<BrewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBrewAnalytics()
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Coffee className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-pulse" />
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-sm">
            Brewing Analytics...
          </p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const now = new Date();
  const todayStr = formatCphDate(now);
  const brewsToday = analytics.history.filter(h => formatCphDate(h.timestamp) === todayStr).length;
  
  // Use Intl for weekday to stay consistent with other helpers
  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Europe/Copenhagen' }).format(now);

  const peakHour =
    Object.keys(analytics.hourDistribution).length > 0
      ? `${Object.entries(analytics.hourDistribution).sort(
          (a, b) => b[1] - a[1],
        )[0][0]}h`
      : "--";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold uppercase text-xs tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Analyze Consumption
            </h1>
          </div>
        </div>

        {/* Predictive Insight Banner */}
        {analytics.predictedNextBrew && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200/50 dark:border-amber-800/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-amber-500/5">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500 rounded-2xl p-3 shadow-lg shadow-amber-500/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-amber-900 dark:text-amber-100 font-black uppercase tracking-tight text-xl flex items-center justify-center md:justify-start gap-2">
                  Next Brew Predicted
                  <div className="group relative flex items-center">
                    <Info className="w-4 h-4 text-amber-500/40 cursor-help transition-colors group-hover:text-amber-500" />
                    <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 bottom-full mb-3 w-56 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] p-3 rounded-xl font-bold normal-case tracking-tight shadow-2xl z-50">
                      <div className="relative">
                        Averaged from historical brew times for today&apos;s sequence (pot #{brewsToday + 1} on a {dayName}).
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 md:left-2 md:translate-x-0 border-8 border-transparent border-t-slate-900 dark:border-t-slate-100" />
                      </div>
                    </div>
                  </div>
                </h3>
                <p className="text-amber-700/80 dark:text-amber-400/80 text-xs font-bold uppercase tracking-widest">
                  Based on your typical {dayName} rhythm
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end">
              <span className="text-6xl font-black text-amber-600 dark:text-amber-500 tabular-nums leading-none tracking-tighter">
                {analytics.predictedNextBrew.time}
              </span>
              <span className="text-[10px] font-black text-amber-500/60 dark:text-amber-600/60 uppercase tracking-[0.3em] mt-3">
                Estimated Time
              </span>
            </div>
          </div>
        )}

        {/* Top Stats */}
        <CollapsibleSection title="Key Metrics" icon={LayoutGrid}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile
              label="Total Brews"
              value={String(analytics.totalBrews)}
              icon={CoffeeIcon}
            />
            <StatTile
              label="Avg / Day"
              value={analytics.avgBrewsPerDay.toFixed(1)}
              icon={Calendar}
            />
            <StatTile label="Peak Hour" value={peakHour} icon={Clock} />
            <StatTile
              label="Big / Small"
              value={`${analytics.bigBrews}/${analytics.smallBrews}`}
              icon={Coffee}
            />
          </div>
        </CollapsibleSection>

        {/* Charts */}
        <div className="space-y-8">
          <CollapsibleSection title="Consumption Rhythm" icon={Clock}>
            <AggregateRhythm history={analytics.history} />
          </CollapsibleSection>
          <CollapsibleSection title="Coffee Burn Rate" icon={Weight}>
            <CoffeeBurnChart history={analytics.history} />
          </CollapsibleSection>

          {/* Deep Dive / Fun Facts */}
          <CollapsibleSection title="Deep Dive Fun Facts" icon={Info}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
                  <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">
                    Total Volume
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {Math.round(analytics.totalLiters)}L
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    Enough to fill {Math.floor(analytics.totalLiters / 0.25)} standard cups.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-xl">
                  <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">
                    Caffeine Load
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {Math.round(analytics.espressoEquivalent)} Shots
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    Equivalent to double espressos brewed.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl">
                  <Hourglass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">
                    Patience Metric
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {(analytics.totalWaitingMins / 60).toFixed(1)}h
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    Total time spent waiting for the pot to brew.
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
