"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrewAnalytics, BrewAnalytics } from "@/app/actions";
import { Coffee, ArrowLeft, BarChart2, Calendar, Clock, Coffee as CoffeeIcon, LayoutGrid, Weight } from "lucide-react";
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
        </div>
      </div>
    </div>
  );
}
