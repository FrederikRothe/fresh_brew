'use client';

import { useState, useEffect, useTransition } from 'react';
import { startBrew, getBrewStatus, BrewStatus } from '@/app/actions';
import { Coffee, RefreshCw, Clock, History, Lock, Unlock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BREW_TIME_MS = 7 * 60 * 1000;
const FRESH_THRESHOLD_MS = 15 * 60 * 1000;
const SOUR_THRESHOLD_MS = 25 * 60 * 1000;
const RESET_THRESHOLD_MS = 60 * 60 * 1000;

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

  // Poll for status updates every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const newStatus = await getBrewStatus();
        // Update local status if the server has a newer brew timestamp
        if (newStatus.lastBrewTimestamp !== status.lastBrewTimestamp) {
          setStatus(newStatus);
        }
      } catch (error) {
        // Silently fail polling errors to avoid interrupting the user experience
        console.error('Failed to poll brew status:', error);
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [status.lastBrewTimestamp]);

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
  
  // Status calculation
  let statusText = 'STALE / EMPTY';
  let statusColor = 'bg-slate-500';
  let message = 'Prompt users to make a new pot';
  let displayMins = 0;
  let displaySecs = 0;
  let labelText = 'Freshness Timer';

  if (elapsedMs < BREW_TIME_MS) {
    // Brewing phase: 7 minute countdown
    const remainingMs = Math.max(0, BREW_TIME_MS - elapsedMs);
    displayMins = Math.floor(remainingMs / 60000);
    displaySecs = Math.floor((remainingMs % 60000) / 1000);
    statusText = 'BREWING...';
    statusColor = 'bg-blue-500';
    message = 'Patience, the magic is happening.';
    labelText = 'Brewing Countdown';
  } else if (elapsedMs < RESET_THRESHOLD_MS) {
    // Post-brew phases: counting up from 00:00
    const sinceBrewedMs = elapsedMs - BREW_TIME_MS;
    displayMins = Math.floor(sinceBrewedMs / 60000);
    displaySecs = Math.floor((sinceBrewedMs % 60000) / 1000);

    if (sinceBrewedMs < FRESH_THRESHOLD_MS) {
      statusText = 'FRESH!';
      statusColor = 'bg-emerald-500';
      message = 'Brewed recently. Enjoy!';
    } else if (sinceBrewedMs < SOUR_THRESHOLD_MS) {
      statusText = 'GETTING SOUR';
      statusColor = 'bg-amber-500';
      message = 'Getting there, but still tasty.';
    } else {
      statusText = 'STALE';
      statusColor = 'bg-rose-500';
      message = 'Running low or getting cold.';
    }
    labelText = 'Time Since Ready';
  }

  const isReset = elapsedMs >= RESET_THRESHOLD_MS;

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center p-3 md:p-6 transition-colors duration-1000 relative",
      statusColor
    )}>
      {/* Discrete Login Button */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50">
        {adminPassword ? (
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full text-white text-[11px] md:text-sm font-bold transition-all border border-white/20"
          >
            <Unlock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="uppercase tracking-tight">
              <span className="md:hidden">Admin</span>
              <span className="hidden md:inline">Brewer Mode (Active)</span>
            </span>
          </button>
        ) : (
          <button 
            onClick={handleLogin}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full text-white/70 hover:text-white text-[11px] md:text-sm font-bold transition-all border border-white/10"
          >
            <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="uppercase tracking-tight">
              <span className="md:hidden">Login</span>
              <span className="hidden md:inline">Coffee Brewer Login</span>
            </span>
          </button>
        )}
      </div>

      <div className="max-w-3xl w-full bg-white/90 backdrop-blur-md rounded-3xl md:rounded-[2.5rem] shadow-2xl p-5 md:p-12 flex flex-col items-center text-center space-y-8 md:space-y-10 border-4 border-white/20">
        
        {/* Header Section */}
        <div className="space-y-1 md:space-y-2">
          <div className="flex items-center justify-center space-x-2 md:space-x-3 mb-2 md:mb-4">
            <Coffee className="w-8 h-8 md:w-10 md:h-10 text-slate-800" />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 uppercase">
              Coffee Tracker
            </h1>
          </div>
          <p className="text-slate-600 font-medium text-[11px] md:text-lg uppercase tracking-widest px-2">Office Refreshment Dashboard</p>
        </div>

        {/* Main Timer Display */}
        <div className="w-full py-8 md:py-12 px-3 md:px-6 rounded-[2rem] md:rounded-3xl bg-slate-900 text-white shadow-inner relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mb-2 md:mb-4 flex items-center">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              {labelText}
            </span>
            
            {isReset || lastBrew === null ? (
              <div className="text-6xl md:text-9xl font-black tabular-nums tracking-tighter text-slate-300">
                --:--
              </div>
            ) : (
              <div className="text-6xl md:text-9xl font-black tabular-nums tracking-tighter">
                {String(displayMins).padStart(2, '0')}:{String(displaySecs).padStart(2, '0')}
              </div>
            )}
            
            <div className={cn(
              "mt-5 md:mt-6 px-5 md:px-6 py-1.5 md:py-2 rounded-full text-base md:text-xl font-bold uppercase tracking-wider",
              statusColor,
              "text-white shadow-lg animate-pulse"
            )}>
              {statusText}
            </div>
          </div>
          {/* Decorative Background Element */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 md:w-64 md:h-64 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        {/* Stats & Actions */}
        <div className={cn(
          "grid gap-4 md:gap-6 w-full",
          adminPassword ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        )}>
          <div className={cn(
            "bg-slate-100 p-5 md:p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-200 transition-all duration-500",
            !adminPassword && "py-8 md:py-12"
          )}>
            <span className="text-slate-500 font-bold uppercase text-[10px] md:text-xs tracking-wider mb-1 md:mb-2 flex items-center">
              <History className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5" />
              Daily Pot Count
            </span>
            <span className="text-4xl md:text-5xl font-black text-slate-900">{status.dailyBrewCount}</span>
          </div>
          
          {adminPassword && (
            <button
              onClick={handleStartBrew}
              disabled={isPending}
              className={cn(
                "relative group h-full w-full rounded-2xl py-5 md:py-6 flex flex-col items-center justify-center transition-all duration-300 active:scale-95 disabled:opacity-70 overflow-hidden",
                "bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl"
              )}
            >
              {isPending ? (
                <RefreshCw className="w-8 h-8 md:w-10 md:h-10 animate-spin" />
              ) : (
                <>
                  <span className="text-xl md:text-2xl font-black uppercase tracking-tight px-4">Start Fresh Brew</span>
                  <span className="text-[10px] md:text-sm text-slate-400 font-bold mt-1 uppercase">Click when coffee is brewing</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Footer Hint */}
        <p className="text-slate-400 font-semibold italic text-xs md:text-base px-2">
          &quot;{message}&quot;
        </p>
      </div>
    </div>
  );
}
