'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrewAnalytics, BrewAnalytics } from '@/app/actions';
import { Coffee, ArrowLeft, BarChart2, Calendar, Clock, Coffee as CoffeeIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function StatTile({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-white rounded-2xl p-6 flex flex-col items-center border border-slate-200 shadow-sm">
      <Icon className="w-5 h-5 text-slate-400 mb-2" />
      <span className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">{label}</span>
      <span className="text-4xl font-black text-slate-900">{value}</span>
    </div>
  );
}

import { format, getDay, startOfDay } from 'date-fns';

function WeeklyRhythm({ history, label }: { history: { timestamp: number; durationMs: number }[]; label: string }) {
  if (history.length === 0) return null;

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const MIN_HOUR = 7;
  const MAX_HOUR = 18;
  const HOUR_RANGE = MAX_HOUR - MIN_HOUR;

  // Filter for weekdays and the focused time window
  const processedData = history.map(h => {
    const d = new Date(h.timestamp);
    const dayIdx = getDay(d); // 0=Sun, 1=Mon...6=Sat
    const hour = d.getHours() + d.getMinutes() / 60;
    
    return {
      dayIdx,
      hour,
      isSmall: h.durationMs < 5 * 60 * 1000,
      dateStr: format(d, 'MMM d, yyyy'),
      timeStr: format(d, 'HH:mm'),
      // Random jitter for better visualization of overlaps
      jitter: Math.random() * 40 - 20 
    };
  }).filter(d => d.dayIdx >= 1 && d.dayIdx <= 5);

  return (
    <div className="w-full bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            {label}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Aggregate (7 AM — 6 PM)</p>
        </div>
        <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500/60" />
            <span className="text-slate-500">Big Brew</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
            <span className="text-slate-500">Small Brew</span>
          </div>
        </div>
      </div>

      <div className="relative h-[500px] flex group">
        {/* Y-Axis Labels (Time) */}
        <div className="flex flex-col justify-between text-[10px] font-bold text-slate-400 w-12 text-right pr-3 py-4 border-r border-slate-100">
          <span>6 PM</span>
          <span>4 PM</span>
          <span>2 PM</span>
          <span>12 PM</span>
          <span>10 AM</span>
          <span>8 AM</span>
          <span>7 AM</span>
        </div>

        {/* Swimlanes */}
        <div className="flex-1 flex">
          {DAYS.map((day, idx) => {
            const dayBrews = processedData.filter(d => d.dayIdx === idx + 1);
            
            return (
              <div key={day} className="flex-1 relative border-r border-slate-50 last:border-r-0 group/lane">
                {/* Lane Background */}
                <div className="absolute inset-0 bg-slate-50/0 group-hover/lane:bg-slate-50/50 transition-colors" />
                
                {/* Day Header */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[11px] font-black text-slate-400 uppercase tracking-tighter">
                  {day}
                </div>

                {/* Hour Grid Lines */}
                {[8, 10, 12, 14, 16, 18].map(h => (
                  <div 
                    key={h} 
                    className="absolute w-full border-t border-slate-100/50" 
                    style={{ bottom: `${((h - MIN_HOUR) / HOUR_RANGE) * 100}%` }} 
                  />
                ))}

                {/* The Brew Dots */}
                <div className="absolute inset-0 overflow-hidden">
                  {dayBrews.map((brew, i) => {
                    const yPos = ((brew.hour - MIN_HOUR) / HOUR_RANGE) * 100;
                    
                    // Only render if within range
                    if (brew.hour < MIN_HOUR || brew.hour > MAX_HOUR) return null;

                    return (
                      <div
                        key={i}
                        className={cn(
                          "absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-150 cursor-pointer z-10",
                          brew.isSmall ? "bg-amber-400/40 hover:bg-amber-500" : "bg-blue-500/40 hover:bg-blue-600",
                          "ring-1 ring-white/50 shadow-sm"
                        )}
                        style={{ 
                          bottom: `${yPos}%`,
                          left: `calc(50% + ${brew.jitter}px)`
                        }}
                        title={`${brew.dateStr} @ ${brew.timeStr}`}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                          {brew.dateStr} @ {brew.timeStr}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic pt-4">
        &quot;The darker the cluster, the more reliable the caffeine fix.&quot;
      </p>
    </div>
  );
}

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Coffee className="w-12 h-12 text-slate-300 animate-pulse" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Brewing Analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const peakHour = Object.keys(analytics.hourDistribution).length > 0
    ? `${Object.entries(analytics.hourDistribution).sort((a, b) => b[1] - a[1])[0][0]}h`
    : '--';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold uppercase text-xs tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-slate-900" />
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Analyze Consumption</h1>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Total Brews" value={String(analytics.totalBrews)} icon={CoffeeIcon} />
          <StatTile label="Avg / Day" value={analytics.avgBrewsPerDay.toFixed(1)} icon={Calendar} />
          <StatTile label="Peak Hour" value={peakHour} icon={Clock} />
          <StatTile label="Big / Small" value={`${analytics.durationBreakdown[7 * 60 * 1000] ?? 0}/${analytics.durationBreakdown[4 * 60 * 1000] ?? 0}`} icon={Coffee} />
        </div>

        {/* Charts */}
        <div className="space-y-12">
          <WeeklyRhythm 
            label="Weekly Aggregate Rhythm"
            history={analytics.history}
          />
        </div>
      </div>
    </div>
  );
}
