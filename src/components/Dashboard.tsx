'use client';

import { useState, useEffect, useTransition } from 'react';
import { startBrew, BrewStatus } from '@/app/actions';
import { Coffee, RefreshCw, Clock, History, Lock, Unlock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FRESHNESS_WINDOW_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function Dashboard({ initialStatus }: { initialStatus: BrewStatus }) {
  const [status, setStatus] = useState<BrewStatus>(initialStatus);
  const [now, setNow] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const [adminPassword, setAdminPassword] = useState<string | null>(null);

  // Load password from localStorage on mount (hydration safe)
  useEffect(() => {
    const savedPassword = localStorage.getItem('coffee_admin_password');
    if (savedPassword) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdminPassword(savedPassword);
    }
  }, []);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    const password = prompt('Please enter the admin password to login:');
    if (password) {
      setAdminPassword(password);
      localStorage.setItem('coffee_admin_password', password);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out of brewer mode?')) {
      setAdminPassword(null);
      localStorage.removeItem('coffee_admin_password');
    }
  };

  const handleStartBrew = async () => {
    let passwordToUse = adminPassword;

    if (!passwordToUse) {
      passwordToUse = prompt('Please enter the admin password to start a new brew:');
      if (!passwordToUse) return;
    }

    startTransition(async () => {
      try {
        const result = await startBrew(passwordToUse!);
        if (result.success) {
          setStatus({
            lastBrewTimestamp: result.timestamp,
            dailyBrewCount: result.count,
            lastBrewDate: new Date().toISOString().split('T')[0],
          });
          // If the prompt was used, optionally save it
          if (!adminPassword && confirm('Stay logged in as coffee brewer?')) {
            setAdminPassword(passwordToUse!);
            localStorage.setItem('coffee_admin_password', passwordToUse!);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          alert('Incorrect password. Access denied.');
          // If stored password failed, clear it
          if (adminPassword) {
            setAdminPassword(null);
            localStorage.removeItem('coffee_admin_password');
          }
        } else {
          alert('Failed to start brew. Make sure storage is configured correctly.');
        }
      }
    });
  };

  const lastBrew = status.lastBrewTimestamp;
  const elapsedMs = lastBrew ? now - lastBrew : Infinity;
  const elapsedMins = elapsedMs / 60000;
  
  const remainingMs = Math.max(0, FRESHNESS_WINDOW_MS - elapsedMs);
  const remainingMins = Math.floor(remainingMs / 60000);
  const remainingSecs = Math.floor((remainingMs % 60000) / 1000);

  // Status calculation
  let statusText = 'STALE / EMPTY';
  let statusColor = 'bg-slate-500';
  let message = 'Prompt users to make a new pot';

  if (elapsedMins < 10) {
    statusText = 'FRESH!';
    statusColor = 'bg-emerald-500';
    message = 'Brewed recently. Enjoy!';
  } else if (elapsedMins < 20) {
    statusText = 'STILL GOOD';
    statusColor = 'bg-amber-500';
    message = 'Getting there, but still tasty.';
  } else if (elapsedMins < 30) {
    statusText = 'DRINK AT OWN RISK';
    statusColor = 'bg-rose-500';
    message = 'Running low or getting cold.';
  }

  const isStale = elapsedMins >= 30;

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-1000 relative",
      statusColor
    )}>
      {/* Discrete Login Button */}
      <div className="absolute top-6 right-6 z-50">
        {adminPassword ? (
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold transition-all border border-white/20"
          >
            <Unlock className="w-4 h-4" />
            <span className="hidden md:inline uppercase tracking-tight">Brewer Mode (Active)</span>
          </button>
        ) : (
          <button 
            onClick={handleLogin}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white/70 hover:text-white text-sm font-bold transition-all border border-white/10"
          >
            <Lock className="w-4 h-4" />
            <span className="hidden md:inline uppercase tracking-tight">Coffee Brewer Login</span>
          </button>
        )}
      </div>

      <div className="max-w-3xl w-full bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-8 md:p-12 flex flex-col items-center text-center space-y-10 border-4 border-white/20">
        
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Coffee className="w-10 h-10 text-slate-800" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase">
              Coffee Tracker
            </h1>
          </div>
          <p className="text-slate-600 font-medium text-lg uppercase tracking-widest">Office Refreshment Dashboard</p>
        </div>

        {/* Main Timer Display */}
        <div className="w-full py-12 px-6 rounded-3xl bg-slate-900 text-white shadow-inner relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Freshness Countdown
            </span>
            
            {isStale ? (
              <div className="text-7xl md:text-9xl font-black tabular-nums tracking-tighter text-slate-300">
                --:--
              </div>
            ) : (
              <div className="text-7xl md:text-9xl font-black tabular-nums tracking-tighter">
                {String(remainingMins).padStart(2, '0')}:{String(remainingSecs).padStart(2, '0')}
              </div>
            )}
            
            <div className={cn(
              "mt-6 px-6 py-2 rounded-full text-xl font-bold uppercase tracking-wider",
              statusColor,
              "text-white shadow-lg animate-pulse"
            )}>
              {statusText}
            </div>
          </div>
          {/* Decorative Background Element */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        {/* Stats & Actions */}
        <div className={cn(
          "grid gap-6 w-full",
          adminPassword ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        )}>
          <div className={cn(
            "bg-slate-100 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-200 transition-all duration-500",
            !adminPassword && "py-12"
          )}>
            <span className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-2 flex items-center">
              <History className="w-4 h-4 mr-1.5" />
              Daily Pot Count
            </span>
            <span className="text-5xl font-black text-slate-900">{status.dailyBrewCount}</span>
          </div>
          
          {adminPassword && (
            <button
              onClick={handleStartBrew}
              disabled={isPending}
              className={cn(
                "relative group h-full w-full rounded-2xl py-6 flex flex-col items-center justify-center transition-all duration-300 active:scale-95 disabled:opacity-70 overflow-hidden",
                "bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl"
              )}
            >
              {isPending ? (
                <RefreshCw className="w-10 h-10 animate-spin" />
              ) : (
                <>
                  <span className="text-2xl font-black uppercase tracking-tight">Start Fresh Brew</span>
                  <span className="text-sm text-slate-400 font-bold mt-1 uppercase">Click when coffee is brewing</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Footer Hint */}
        <p className="text-slate-400 font-semibold italic">
          &quot;{message}&quot;
        </p>
      </div>
    </div>
  );
}
