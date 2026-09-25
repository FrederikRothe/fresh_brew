"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrewAnalytics, BrewAnalytics } from "@/app/actions";
import { Coffee, ArrowLeft, BarChart2, Calendar, Clock, Coffee as CoffeeIcon, LayoutGrid, Weight, Droplets, Zap, Hourglass, Info, AlertTriangle } from "lucide-react";
import { formatCphDate } from "@/lib/utils";
import { SMALL_BATCH_THRESHOLD_MS } from "@/lib/constants";
import { StatTile } from "@/components/StatTile";
import { AggregateRhythm } from "@/components/AggregateRhythm";
import { CoffeeBurnChart } from "@/components/CoffeeBurnChart";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { BrewTimeline } from "@/components/BrewTimeline";

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
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-sm">
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

  // Calculate waste correlation stats
  let bigPotWaste = 0;
  let smallPotWaste = 0;
  Object.entries(analytics.wasteByDuration).forEach(([duration, count]) => {
    if (Number(duration) > SMALL_BATCH_THRESHOLD_MS) {
      bigPotWaste += count;
    } else {
      smallPotWaste += count;
    }
  });

  const hasWaste = bigPotWaste + smallPotWaste > 0;

  const funFacts: {
    label: string;
    value: string;
    caption: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
  }[] = [
    {
      label: "Total Volume",
      value: `${Math.round(analytics.totalLiters)}L`,
      caption: `Enough to fill ${Math.floor(analytics.totalLiters / 0.25)} standard cups.`,
      icon: Droplets,
      tone: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    },
    {
      label: "Caffeine Load",
      value: `${Math.round(analytics.espressoEquivalent)} Shots`,
      caption: "Equivalent to double espressos brewed.",
      icon: Zap,
      tone: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    },
    {
      label: "Patience Metric",
      value: `${(analytics.totalWaitingMins / 60).toFixed(1)}h`,
      caption: "Total time spent waiting for the pot to brew.",
      icon: Hourglass,
      tone: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Waste Correlation",
      value: hasWaste ? `${bigPotWaste} Big vs ${smallPotWaste} Small` : "No waste yet",
      caption: hasWaste
        ? "Distribution of waste events by pot size."
        : "Every pot has been finished so far. Nice work!",
      icon: AlertTriangle,
      tone: hasWaste
        ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <header className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 md:w-7 md:h-7 shrink-0 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-none">
              Analyze Consumption
            </h1>
          </div>
          <button
            onClick={() => router.push("/")}
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 -ml-3 sm:ml-0 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 font-bold uppercase text-xs tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </header>

        {/* Visual Timeline & Predictions */}
        <BrewTimeline
          history={analytics.history}
          predictedNextBrew={analytics.predictedNextBrew ? {
            time: analytics.predictedNextBrew.time,
            sequenceIndex: brewsToday + 1,
            dayName: dayName
          } : null}
        />

        {/* Top Stats */}
        <CollapsibleSection title="Key Metrics" icon={LayoutGrid}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
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
            <StatTile
              label="Total Waste"
              value={String(analytics.totalWasteCount)}
              icon={Droplets}
              className="col-span-2 sm:col-span-1"
              valueClassName={analytics.totalWasteCount > 0 ? "text-red-600 dark:text-red-400" : undefined}
            />
          </div>
        </CollapsibleSection>

        {/* Charts */}
        <CollapsibleSection title="Consumption Rhythm" icon={Clock}>
          <AggregateRhythm history={analytics.history} />
        </CollapsibleSection>
        <CollapsibleSection title="Coffee Burn Rate" icon={Weight}>
          <CoffeeBurnChart history={analytics.history} />
        </CollapsibleSection>

        {/* Deep Dive / Fun Facts */}
        <CollapsibleSection title="Deep Dive Fun Facts" icon={Info}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {funFacts.map(({ label, value, caption, icon: Icon, tone }) => (
              <div
                key={label}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/60 flex items-start gap-4"
              >
                <div className={`p-3 rounded-xl shrink-0 ${tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1">
                    {label}
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                    {value}
                  </p>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
                    {caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
