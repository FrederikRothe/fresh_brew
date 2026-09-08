"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrewAnalytics, type BrewAnalytics } from "@/app/actions";
import {
  Coffee,
  ArrowLeft,
  BarChart2,
  Calendar,
  Clock,
  LayoutGrid,
  Weight,
  Droplets,
  Zap,
  Hourglass,
  Info,
  AlertTriangle,
  Leaf,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
} from "@/lib/analytics";
import { StatTile } from "@/components/StatTile";
import { AggregateRhythm } from "@/components/AggregateRhythm";
import { CoffeeBurnChart } from "@/components/CoffeeBurnChart";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { BrewTimeline } from "@/components/BrewTimeline";

function formatPct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function wowLabel(pct: number | null): { text: string; className: string; Icon: typeof TrendingUp } {
  if (pct == null) {
    return { text: "n/a", className: "text-slate-400", Icon: Minus };
  }
  const rounded = Math.round(pct);
  if (rounded > 0) {
    return { text: `+${rounded}%`, className: "text-emerald-600 dark:text-emerald-400", Icon: TrendingUp };
  }
  if (rounded < 0) {
    return { text: `${rounded}%`, className: "text-rose-500", Icon: TrendingDown };
  }
  return { text: "0%", className: "text-slate-400", Icon: Minus };
}

export function AnalyzeDashboard({
  initialAnalytics,
  initialError = null,
}: {
  initialAnalytics: BrewAnalytics | null;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<BrewAnalytics | null>(initialAnalytics);
  const [error, setError] = useState<string | null>(initialError);
  const [retrying, setRetrying] = useState(false);
  const [period, setPeriod] = useState<AnalyticsPeriod>("last7");

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const next = await getBrewAnalytics();
      setAnalytics(next);
      setError(null);
    } catch {
      setError("Could not load analytics from storage. Check Redis and try again.");
    } finally {
      setRetrying(false);
    }
  };

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
            Analytics unavailable
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {error || "Could not load brew analytics."}
          </p>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black uppercase tracking-wider disabled:opacity-60"
          >
            <RefreshCw className={cn("w-4 h-4", retrying && "animate-spin")} />
            {retrying ? "Retrying…" : "Retry"}
          </button>
          <button
            onClick={() => router.push("/")}
            className="block mx-auto text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const charts = analytics.charts[period];
  const wow = wowLabel(analytics.weekTrend.completeWowPct);
  const WowIcon = wow.Icon;
  const freshness = analytics.freshness;
  const waste = analytics.wasteRates;
  const classified = Math.max(freshness.classified, 1);

  let wasteHint = "Waste rates are similar across pot sizes.";
  if (waste.bigBrews < 3 || waste.smallBrews < 3) {
    wasteHint = "Need more brews of both sizes to compare waste rates.";
  } else if (waste.smallRate + 0.05 < waste.bigRate) {
    wasteHint = "Small pots are wasted less often — brew small when demand is uncertain.";
  } else if (waste.bigRate + 0.05 < waste.smallRate) {
    wasteHint = "Big pots are wasted less often in this office.";
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
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

        <BrewTimeline
          history={analytics.history}
          predictedNextBrew={
            analytics.predictedNextBrew
              ? {
                  time: analytics.predictedNextBrew.time,
                  sequenceIndex: analytics.brewsToday + 1,
                  dayName: analytics.dayName,
                  isOverdue: analytics.predictedNextBrew.isOverdue,
                  overdueMins: analytics.predictedNextBrew.overdueMins,
                }
              : null
          }
        />

        <CollapsibleSection title="Key Metrics" icon={LayoutGrid}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatTile label="Total Brews" value={String(analytics.totalBrews)} icon={Coffee} />
            <StatTile
              label="Avg pots / day"
              value={analytics.avgBrewsPerDay.toFixed(1)}
              icon={Calendar}
              hint="Days with at least one brew"
            />
            <StatTile
              label="Avg g / day"
              value={`${Math.round(analytics.avgCoffeePerDay)}g`}
              icon={Weight}
              hint={`${analytics.totalCoffeeGrams.toLocaleString()}g total`}
            />
            <StatTile label="Peak Hour" value={analytics.peakHourLabel} icon={Clock} hint="Copenhagen" />
            <StatTile
              label="Big / Small"
              value={`${analytics.bigBrews}/${analytics.smallBrews}`}
              icon={Coffee}
            />
            <StatTile
              label="Waste"
              value={formatPct(waste.overallRate)}
              icon={Droplets}
              valueClassName="text-red-500"
              hint={`${analytics.totalWasteCount} pots dumped`}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Trends" icon={TrendingUp}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatTile
              label="This week"
              value={`${analytics.weekTrend.currentWeekGrams.toLocaleString()}g`}
              icon={Weight}
              hint={analytics.weekTrend.currentWeekKey}
            />
            <StatTile
              label="Last full week"
              value={`${analytics.weekTrend.lastCompleteWeekGrams.toLocaleString()}g`}
              icon={Calendar}
              hint={analytics.weekTrend.lastCompleteWeekKey ?? "—"}
            />
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 flex flex-col items-center border border-slate-200 dark:border-slate-800 shadow-sm">
              <WowIcon className={cn("w-5 h-5 mb-2", wow.className)} />
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                Week vs prior
              </span>
              <span className={cn("text-2xl md:text-4xl font-black", wow.className)}>
                {wow.text}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 text-center leading-snug">
                Last complete ISO week vs the week before
              </span>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Freshness & Waste" icon={Leaf}>
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">
                Did the pot finish while still fresh?
              </p>
              {freshness.classified === 0 ? (
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Not enough finished pots to score freshness yet.
                </p>
              ) : (
                <>
                  <div className="flex h-4 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {[
                      { key: "fresh", color: "bg-emerald-500", n: freshness.fresh },
                      { key: "sour", color: "bg-amber-400", n: freshness.sour },
                      { key: "stale", color: "bg-rose-500", n: freshness.stale },
                      { key: "empty", color: "bg-slate-500", n: freshness.empty },
                    ].map((seg) =>
                      seg.n > 0 ? (
                        <div
                          key={seg.key}
                          className={seg.color}
                          style={{ width: `${(seg.n / classified) * 100}%` }}
                          title={`${seg.key}: ${seg.n}`}
                        />
                      ) : null,
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatTile
                      label="Fresh"
                      value={formatPct(freshness.complianceRate)}
                      icon={Leaf}
                      valueClassName="text-emerald-600 dark:text-emerald-400"
                      hint={`${freshness.fresh} of ${freshness.classified}`}
                    />
                    <StatTile label="Sour" value={String(freshness.sour)} icon={AlertTriangle} hint="25–40 min" />
                    <StatTile label="Stale" value={String(freshness.stale)} icon={Clock} hint="40–120 min" />
                    <StatTile label="Sat empty" value={String(freshness.empty)} icon={Hourglass} hint="120 min+" />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">
                  Big pot waste rate
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {formatPct(waste.bigRate)}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  {waste.bigWasted} of {waste.bigBrews} big pots dumped
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">
                  Small pot waste rate
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {formatPct(waste.smallRate)}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  {waste.smallWasted} of {waste.smallBrews} small pots dumped
                </p>
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {wasteHint}
            </p>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-600">
              Freshness uses the same thresholds as the dashboard: fresh &lt; 25 min after ready, sour until 40 min, stale until 2 h. A pot is scored when the next brew starts or waste is logged. The current unfinished pot is excluded.
            </p>
          </div>
        </CollapsibleSection>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            Chart period (shared)
          </p>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto" role="group" aria-label="Analytics period">
            {ANALYTICS_PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  "px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  period === p.id
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <CollapsibleSection title="Consumption Rhythm" icon={Clock}>
            <AggregateRhythm key={`rhythm-${period}`} data={charts.rhythm} />
          </CollapsibleSection>
          <CollapsibleSection title="Coffee Burn Rate" icon={Weight}>
            <CoffeeBurnChart key={`burn-${period}`} data={charts.burn} />
          </CollapsibleSection>

          <CollapsibleSection title="Deep Dive Fun Facts" icon={Info}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">
                    Waste Correlation
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {formatPct(waste.bigRate)} Big vs {formatPct(waste.smallRate)} Small
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    Share of each pot size that was poured out.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-[10px] font-medium text-slate-400 dark:text-slate-600 leading-relaxed">
              Assumptions: Big pot = 340 g, small pot = 180 g, 60 g/L, 18 g per double espresso. All times are Europe/Copenhagen. Typical weekdays stacks every Mon–Fri in history; Last 7 days / This month / This year are actual calendar windows, not stacked.
            </p>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
