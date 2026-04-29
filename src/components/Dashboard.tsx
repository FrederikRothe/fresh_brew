"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { startBrew, logWaste, type BrewStatus } from "@/app/actions";
import {
  Coffee,
  RefreshCw,
  Clock,
  History,
  Lock,
  Unlock,
  BarChart2,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { cn, formatMinsToDuration } from "@/lib/utils";
import { DEFAULT_BREW_TIME_MS } from "@/lib/constants";
import { computeBrewState } from "@/lib/brew-utils";
import { useTimer } from "@/hooks/use-timer";
import { useBrewStatus } from "@/hooks/use-brew-status";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useBodyBackground } from "@/hooks/use-body-background";
import type { PredictionData } from "@/app/actions";
import ConfirmModal from "./ConfirmModal";

export default function Dashboard({
  initialStatus,
  predictedNextBrew,
}: {
  initialStatus: BrewStatus;
  predictedNextBrew: PredictionData | null;
}) {
  const { status, setStatus } = useBrewStatus(initialStatus);
  const now = useTimer();
  const [isPending, startTransition] = useTransition();
  const [isWastePending, setIsWastePending] = useState(false);
  const [showWasteConfirm, setShowWasteConfirm] = useState(false);
  const { adminPassword, setAdminPassword, handleLogin, handleLogout } =
    useAdminAuth();

  const lastBrew = status.lastBrewTimestamp;
  const elapsedMs = lastBrew ? now - lastBrew : Infinity;
  const {
    statusText,
    statusColor,
    message,
    labelText,
    displayHours,
    displayMins,
    displaySecs,
    isReset,
  } = computeBrewState(
    elapsedMs,
    status.brewDurationMs || DEFAULT_BREW_TIME_MS,
  );

  const isRecentlyBrewed = lastBrew !== null && elapsedMs < 60000;

  useBodyBackground(statusColor);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  const handleLogWaste = async () => {
    if (!adminPassword) return;

    setIsWastePending(true);
    try {
      const result = await logWaste(adminPassword);
      if (result.success) {
        setStatus((prev) => ({
          ...prev,
          lastBrewTimestamp: null,
          brewDurationMs: null,
        }));
        alert("Waste logged successfully.");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        alert("Incorrect password. Access denied.");
        setAdminPassword(null);
        localStorage.removeItem("coffee_admin_password");
      } else {
        alert("Failed to log waste. Please try again.");
      }
    } finally {
      setIsWastePending(false);
    }
  };

  const handleStartBrew = async (durationMs: number = DEFAULT_BREW_TIME_MS) => {
    const password =
      adminPassword ??
      prompt("Please enter the admin password to start a new brew:");
    if (!password) return;

    startTransition(async () => {
      try {
        const result = await startBrew(password, durationMs);
        if (result.success) {
          setStatus({
            lastBrewTimestamp: result.timestamp,
            dailyBrewCount: result.count,
            lastBrewDate: new Date().toISOString().split("T")[0],
            brewDurationMs: durationMs,
          });
          if (!adminPassword && confirm("Stay logged in as coffee brewer?")) {
            setAdminPassword(password);
            localStorage.setItem("coffee_admin_password", password);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
          alert("Incorrect password. Access denied.");
          if (adminPassword) {
            setAdminPassword(null);
            localStorage.removeItem("coffee_admin_password");
          }
        } else if (
          error instanceof Error &&
          error.message.includes("Too many requests")
        ) {
          alert(error.message);
        } else {
          alert(
            "Failed to start brew. Make sure storage is configured correctly.",
          );
        }
      }
    });
  };

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center p-3 md:p-6 relative",
        "landscape:py-4 landscape:justify-start landscape:md:justify-center",
      )}
    >
      {/* Discrete Login Button */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 landscape:top-2 landscape:right-2 landscape:md:top-6 landscape:md:right-6 z-50">
        {adminPassword ? (
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-white/20 dark:bg-slate-800/40 hover:bg-white/30 dark:hover:bg-slate-800/60 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 landscape:px-2 landscape:py-1 landscape:md:px-4 landscape:md:py-2 rounded-full text-white text-[11px] md:text-sm font-bold transition-none border border-white/20 dark:border-slate-700"
          >
            <Unlock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="uppercase tracking-tight">
              <span className="hidden md:inline landscape:hidden landscape:md:inline">
                Brewer Mode (Active)
              </span>
            </span>
          </button>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center space-x-2 bg-white/10 dark:bg-slate-800/20 hover:bg-white/20 dark:hover:bg-slate-800/40 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 landscape:px-2 landscape:py-1 landscape:md:px-4 landscape:md:py-2 rounded-full text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 text-[11px] md:text-sm font-bold transition-none border border-white/10 dark:border-slate-700/50"
          >
            <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="uppercase tracking-tight">
              <span className="hidden md:inline landscape:hidden landscape:md:inline">
                Coffee Brewer Login
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="max-w-3xl w-full bg-white/90 dark:bg-slate-900/90 netlight:bg-white/95 backdrop-blur-md rounded-3xl md:rounded-[2.5rem] shadow-2xl p-5 md:p-12 landscape:p-4 landscape:md:p-12 flex flex-col items-center text-center space-y-8 md:space-y-10 landscape:space-y-4 landscape:md:space-y-10 border-4 border-white/20 dark:border-slate-800/50 netlight:border-nl-purple-d/20">
        {/* Header */}
        <div className="space-y-1 md:space-y-2 landscape:space-y-0 landscape:md:space-y-2">
          <div className="flex items-center justify-center space-x-2 md:space-x-3 mb-2 md:mb-4 landscape:mb-1 landscape:md:mb-4">
            <Coffee className="w-8 h-8 md:w-10 md:h-10 landscape:w-6 landscape:h-6 landscape:md:w-10 landscape:md:h-10 text-slate-800 dark:text-slate-200 netlight:text-nl-purple-d" />
            <h1 className="text-3xl md:text-5xl landscape:text-2xl landscape:md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 netlight:text-nl-purple-d uppercase">
              Coffee Tracker
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 netlight:text-nl-purple font-medium text-[11px] md:text-lg landscape:text-[10px] landscape:md:text-lg uppercase tracking-widest px-2">
            Office Refreshment Dashboard
          </p>
        </div>

        {/* Predictive Insight Banner (Dashboard Version - less dramatic) */}
        {!adminPassword && predictedNextBrew && (
          <div
            className={cn(
              "w-full border rounded-2xl py-3 px-4 flex items-center justify-between shadow-sm transition-colors",
              predictedNextBrew.isOverdue
                ? "bg-amber-100/50 dark:bg-amber-950/20 border-amber-300/50 dark:border-amber-800/30 netlight:bg-nl-yellow/20 netlight:border-nl-yellow/50"
                : "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/20 netlight:bg-nl-beige netlight:border-nl-purple-d/10",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "rounded-xl p-2",
                  predictedNextBrew.isOverdue
                    ? "bg-amber-200 dark:bg-amber-900/40 netlight:bg-nl-yellow"
                    : "bg-amber-100 dark:bg-amber-900/30 netlight:bg-nl-purple-l",
                )}
              >
                {predictedNextBrew.isOverdue ? (
                  <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 netlight:text-nl-purple-d" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-500 netlight:text-nl-purple-d" />
                )}
              </div>
              <div className="text-left">
                <h3
                  className={cn(
                    "font-bold uppercase tracking-tight text-xs",
                    predictedNextBrew.isOverdue
                      ? "text-amber-900 dark:text-amber-100 netlight:text-nl-purple-d"
                      : "text-amber-900 dark:text-amber-100 netlight:text-nl-purple-d",
                  )}
                >
                  {predictedNextBrew.isOverdue
                    ? "Next Brew Overdue"
                    : "Next Brew Predicted"}
                </h3>
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    predictedNextBrew.isOverdue
                      ? "text-amber-700/60 dark:text-amber-500/60 netlight:text-nl-purple/60"
                      : "text-amber-700/60 dark:text-amber-500/60 netlight:text-nl-purple/60",
                  )}
                >
                  {predictedNextBrew.isOverdue
                    ? `Should have been brewed ${formatMinsToDuration(predictedNextBrew.overdueMins)} ago`
                    : "Historical Estimate"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-2xl font-black tabular-nums tracking-tighter",
                  predictedNextBrew.isOverdue
                    ? "text-amber-600 dark:text-amber-500 netlight:text-nl-orange"
                    : "text-amber-600 dark:text-amber-500 netlight:text-nl-purple-d",
                )}
              >
                {predictedNextBrew.time}
              </span>
            </div>
          </div>
        )}

        {/* Main Timer Display */}
        <div className="w-full py-8 md:py-12 landscape:py-4 landscape:md:py-12 px-3 md:px-6 rounded-[2rem] md:rounded-3xl bg-slate-900 dark:bg-black netlight:bg-nl-purple-d text-white shadow-inner relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-[10px] md:text-sm landscape:text-[9px] landscape:md:text-sm font-bold text-slate-400 dark:text-slate-500 netlight:text-nl-purple-l uppercase tracking-[0.3em] mb-2 md:mb-4 landscape:mb-1 landscape:md:mb-4 flex items-center">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              {labelText}
            </span>

            {isReset || lastBrew === null ? (
              <div className="text-6xl md:text-9xl landscape:text-5xl landscape:md:text-9xl font-black tabular-nums tracking-tighter text-slate-300 dark:text-slate-800 netlight:text-nl-purple/30">
                --:--
              </div>
            ) : (
              <div className="text-6xl md:text-9xl landscape:text-5xl landscape:md:text-9xl font-black tabular-nums tracking-tighter netlight:text-white">
                {displayHours > 0 &&
                  `${String(displayHours).padStart(2, "0")}:`}
                {String(displayMins).padStart(2, "0")}:
                {String(displaySecs).padStart(2, "0")}
              </div>
            )}

            <div
              className={cn(
                "mt-5 md:mt-6 landscape:mt-2 landscape:md:mt-6 px-5 md:px-6 py-1.5 md:py-2 rounded-full text-base md:text-xl landscape:text-sm landscape:md:text-xl font-bold uppercase tracking-wider",
                statusColor,
                "text-white shadow-lg animate-pulse netlight:bg-nl-yellow netlight:text-nl-purple-d netlight:shadow-nl-yellow/20",
              )}
            >
              {statusText}
            </div>
          </div>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 md:w-64 md:h-64 landscape:w-32 landscape:h-32 landscape:md:w-64 landscape:md:h-64 bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Daily Count + Brew Buttons (or Waste Button in Brewer Mode) */}
        <div
          className={cn(
            "grid gap-4 md:gap-6 w-full",
            adminPassword
              ? "grid-cols-1 md:grid-cols-2 landscape:grid-cols-2"
              : "grid-cols-1",
          )}
        >
          {adminPassword ? (
            <button
              onClick={() => setShowWasteConfirm(true)}
              disabled={isWastePending}
              className="bg-red-50 dark:bg-red-950/20 netlight:bg-nl-orange/10 p-5 md:p-6 landscape:p-3 landscape:md:p-6 rounded-2xl flex flex-col items-center justify-center border border-red-200 dark:border-red-900/30 netlight:border-nl-orange/30 hover:bg-red-100 dark:hover:bg-red-900/40 netlight:hover:bg-nl-orange/20 active:scale-95 transition-all group"
            >
              {isWastePending ? (
                <RefreshCw className="w-6 h-6 md:w-8 md:h-8 animate-spin text-red-600 dark:text-red-400 netlight:text-nl-orange" />
              ) : (
                <>
                  <span className="text-red-600 dark:text-red-400 netlight:text-nl-orange font-bold uppercase text-[10px] md:text-xs tracking-wider mb-1 md:mb-2 flex items-center group-hover:scale-110 transition-transform">
                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5" />
                    Indicate Waste
                  </span>
                  <span className="text-xl md:text-2xl font-black text-red-700 dark:text-red-300 netlight:text-nl-orange/80 uppercase tracking-tight">
                    Poured in sink
                  </span>
                </>
              )}
            </button>
          ) : (
            <div
              className={cn(
                "bg-slate-100 dark:bg-slate-800/50 netlight:bg-nl-beige p-5 md:p-6 landscape:p-3 landscape:md:p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 netlight:border-nl-purple-d/10",
                "py-8 md:py-12 landscape:py-4 landscape:md:py-12",
              )}
            >
              <span className="text-slate-500 dark:text-slate-400 netlight:text-nl-purple font-bold uppercase text-[10px] md:text-xs tracking-wider mb-1 md:mb-2 flex items-center">
                <History className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5" />
                Daily Pot Count
              </span>
              <span className="text-4xl md:text-5xl landscape:text-2xl landscape:md:text-5xl font-black text-slate-900 dark:text-slate-100 netlight:text-nl-purple-d">
                {status.dailyBrewCount}
              </span>
            </div>
          )}

          {adminPassword && (
            <div className="flex flex-col space-y-3 md:space-y-4">
              <button
                onClick={() => handleStartBrew(7 * 60 * 1000)}
                disabled={isPending || isRecentlyBrewed}
                className="w-full rounded-2xl py-4 md:py-6 flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 disabled:grayscale-[0.5] bg-slate-900 dark:bg-black netlight:bg-nl-purple-d hover:bg-slate-800 dark:hover:bg-slate-950 netlight:hover:bg-nl-purple text-white shadow-xl hover:shadow-2xl border border-white/5 transition-all"
              >
                {isPending ? (
                  <RefreshCw className="w-6 h-6 md:w-8 md:h-8 animate-spin" />
                ) : (
                  <>
                    <span className="text-lg md:text-xl font-black uppercase tracking-tight px-4">
                      {isRecentlyBrewed ? "Brew Started" : "Start BIG Brew"}
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-400 netlight:text-nl-purple-l font-bold mt-1 uppercase">
                      {isRecentlyBrewed ? "Cooldown active" : "7 Minutes"}
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleStartBrew(4 * 60 * 1000)}
                disabled={isPending || isRecentlyBrewed}
                className="w-full rounded-2xl py-4 md:py-6 flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 disabled:grayscale-[0.5] bg-slate-800 dark:bg-slate-900 netlight:bg-nl-purple hover:bg-slate-700 dark:hover:bg-slate-800 netlight:hover:bg-nl-purple-d text-white shadow-lg hover:shadow-xl border border-white/10 dark:border-slate-700 netlight:border-nl-purple-d/20 transition-all"
              >
                {isPending ? (
                  <RefreshCw className="w-6 h-6 md:w-8 md:h-8 animate-spin" />
                ) : (
                  <>
                    <span className="text-lg md:text-xl font-black uppercase tracking-tight px-4 text-slate-200 netlight:text-white">
                      {isRecentlyBrewed ? "Brew Started" : "Start Small Brew"}
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-400 netlight:text-nl-purple-l font-bold mt-1 uppercase">
                      {isRecentlyBrewed ? "Cooldown active" : "4 Minutes"}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Analyze Consumption Link */}
        <div className="w-full">
          <Link
            href="/analyze"
            className="w-full flex items-center justify-between px-4 py-3 md:py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 netlight:bg-nl-beige hover:bg-slate-200 dark:hover:bg-slate-700 netlight:hover:bg-nl-purple-l/50 border border-slate-200 dark:border-slate-700 netlight:border-nl-purple-d/10 text-slate-600 dark:text-slate-400 netlight:text-nl-purple-d hover:text-slate-900 dark:hover:text-slate-100 group"
          >
            <span className="flex items-center gap-2 font-black uppercase text-[11px] md:text-sm tracking-widest">
              <BarChart2 className="w-4 h-4 md:w-5 md:h-5 text-slate-500 dark:text-slate-400 netlight:text-nl-purple group-hover:text-blue-500 dark:group-hover:text-blue-400 netlight:group-hover:text-nl-purple-d" />
              Analyze Consumption
            </span>
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-400 dark:text-slate-500 netlight:text-nl-purple group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Footer Hint */}
        <p className="text-slate-400 dark:text-slate-500 font-semibold italic text-xs md:text-base landscape:text-[10px] landscape:md:text-base px-2">
          &quot;{message}&quot;
        </p>
      </div>

      <ConfirmModal
        isOpen={showWasteConfirm}
        onClose={() => setShowWasteConfirm(false)}
        onConfirm={handleLogWaste}
        title="Log Coffee Waste?"
        message="Are you sure you want to indicate that coffee was poured in the sink? This will be logged for analytics."
      />
    </div>
  );
}
