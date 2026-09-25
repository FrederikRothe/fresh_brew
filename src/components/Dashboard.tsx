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
  Github,
} from "lucide-react";
import { cn, formatMinsToDuration } from "@/lib/utils";
import {
  DEFAULT_BREW_TIME_MS,
  SMALL_BREW_TIME_MS,
  REPO_URL,
} from "@/lib/constants";
import { computeBrewState } from "@/lib/brew-utils";
import { useTimer } from "@/hooks/use-timer";
import { useBrewStatus } from "@/hooks/use-brew-status";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useBodyBackground } from "@/hooks/use-body-background";
import type { PredictionData } from "@/app/actions";
import ConfirmModal from "./ConfirmModal";
import ThemeToggle from "./ThemeToggle";

const BREW_BUTTONS = [
  { durationMs: DEFAULT_BREW_TIME_MS, label: "Start BIG Brew", sub: "7 Minutes", primary: true },
  { durationMs: SMALL_BREW_TIME_MS, label: "Start Small Brew", sub: "4 Minutes", primary: false },
];

const tile =
  "rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg ring-1 ring-black/5 dark:ring-white/10";

export default function Dashboard({
  initialStatus,
  predictedNextBrew,
}: {
  initialStatus: BrewStatus;
  predictedNextBrew?: PredictionData | null;
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
  const brewDurationMs = status.brewDurationMs || DEFAULT_BREW_TIME_MS;
  const {
    statusText,
    statusColor,
    message,
    labelText,
    displayHours,
    displayMins,
    displaySecs,
    isReset,
  } = computeBrewState(elapsedMs, brewDurationMs);

  const isRecentlyBrewed = lastBrew !== null && elapsedMs < 60000;
  const isBrewing = !isReset && lastBrew !== null && elapsedMs < brewDurationMs;
  const hasTime = !isReset && lastBrew !== null;
  const hasHours = hasTime && displayHours > 0;
  const timeText = hasTime
    ? `${hasHours ? `${String(displayHours).padStart(2, "0")}:` : ""}${String(
        displayMins,
      ).padStart(2, "0")}:${String(displaySecs).padStart(2, "0")}`
    : "--:--";

  const showPrediction = !adminPassword && !!predictedNextBrew;

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

  // Layout: portrait phone / desktop is a single column of tiles. On `landscape-phone`
  // (short landscape viewport, see globals.css) it becomes a no-scroll two-column grid:
  // the timer fills the left column, the rest stack on the right. The right-column
  // wrapper is `display: contents` outside landscape so its children join the single
  // column flow (the header is pulled to the top with `order-first`).
  return (
    <div
      data-dashboard
      className={cn(
        "min-h-[100dvh] w-full flex items-center justify-center",
        "pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]",
        "md:p-8",
        "landscape-phone:h-[100dvh] landscape-phone:min-h-0 landscape-phone:overflow-hidden",
        "landscape-phone:pt-[max(0.5rem,env(safe-area-inset-top))] landscape-phone:pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        "landscape-phone:pl-[max(0.5rem,env(safe-area-inset-left))] landscape-phone:pr-[max(0.5rem,env(safe-area-inset-right))]",
      )}
    >
      <div
        className={cn(
          "w-full max-w-3xl flex flex-col gap-3 md:gap-4",
          "landscape-phone:max-w-none landscape-phone:h-full landscape-phone:grid landscape-phone:gap-2",
          "landscape-phone:grid-cols-[minmax(0,1fr)_17rem]",
        )}
      >
        {/* ── Timer (hero) ─────────────────────────────────────────── */}
        <section
          aria-label="Coffee freshness"
          className={cn(
            "relative overflow-hidden min-w-0 rounded-3xl md:rounded-[2.5rem]",
            "bg-slate-950/90 dark:bg-black/90 text-white shadow-2xl ring-1 ring-white/10",
            "flex flex-col items-center justify-center text-center",
            "px-4 py-8 md:py-12 landscape-phone:h-full landscape-phone:min-h-0 landscape-phone:px-3 landscape-phone:py-3",
          )}
        >
          <span className="flex items-center text-xs md:text-sm font-bold text-slate-300 uppercase tracking-[0.25em]">
            <Clock className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            {labelText}
          </span>

          <div
            className={cn(
              "font-black tabular-nums tracking-tighter leading-none my-3 md:my-5 landscape-phone:my-[2dvh]",
              hasTime ? "text-white" : "text-slate-600",
              hasHours
                ? "text-[clamp(2.75rem,16vw,7rem)] landscape-phone:text-[min(12vw,34dvh)]"
                : "text-[clamp(3.75rem,25vw,9.5rem)] landscape-phone:text-[min(17vw,44dvh)]",
            )}
          >
            {timeText}
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 md:px-6 py-1.5 md:py-2",
              "text-base md:text-xl landscape-phone:text-lg font-black uppercase tracking-wider text-white",
              "shadow-lg ring-2 ring-white/25",
              statusColor,
            )}
          >
            {isBrewing && (
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-white/80 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
            )}
            <span>{statusText}</span>
          </div>

          <p className="mt-4 md:mt-6 landscape-phone:mt-[2dvh] text-xs md:text-base font-semibold italic text-slate-300 px-2">
            &quot;{message}&quot;
          </p>
        </section>

        {/* ── Side column (landscape) / remaining flow (portrait) ─── */}
        <div className="contents landscape-phone:flex landscape-phone:flex-col landscape-phone:gap-2 landscape-phone:min-h-0 landscape-phone:min-w-0">
          {/* Header: brand + controls */}
          <header
            className={cn(
              tile,
              "order-first landscape-phone:order-none",
              "flex items-center justify-between gap-2 pl-4 pr-1.5 py-1.5 md:pl-6 md:pr-3 md:py-3",
              "landscape-phone:pl-3 landscape-phone:pr-1 landscape-phone:py-0.5",
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 md:gap-3">
                <Coffee
                  className="w-6 h-6 md:w-9 md:h-9 landscape-phone:w-4 landscape-phone:h-4 shrink-0 text-slate-800 dark:text-slate-200"
                  aria-hidden
                />
                <h1 className="truncate text-xl md:text-4xl landscape-phone:text-[13px] font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                  Coffee Tracker
                </h1>
              </div>
              <p className="hidden md:block landscape-phone:hidden text-slate-600 dark:text-slate-400 font-semibold text-sm uppercase tracking-widest mt-1">
                Office Refreshment Dashboard
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle variant="inline" />
              <button
                type="button"
                onClick={adminPassword ? handleLogout : handleLogin}
                aria-label={adminPassword ? "Log out of Brewer Mode" : "Coffee Brewer Login"}
                title={adminPassword ? "Brewer Mode active — tap to log out" : "Coffee Brewer Login"}
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-11 min-w-11 px-3 rounded-xl text-sm font-bold uppercase tracking-tight",
                  "landscape-phone:px-0 landscape-phone:w-11",
                  adminPassword
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-white"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
              >
                {adminPassword ? (
                  <Unlock className="w-4 h-4 shrink-0" aria-hidden />
                ) : (
                  <Lock className="w-4 h-4 shrink-0" aria-hidden />
                )}
                <span className="hidden md:inline landscape-phone:hidden">
                  {adminPassword ? "Brewer Mode (Active)" : "Coffee Brewer Login"}
                </span>
              </button>
            </div>
          </header>

          {/* Stats: pot count + next-brew prediction */}
          <div
            className={cn(
              "grid gap-3 md:gap-4",
              showPrediction ? "grid-cols-2" : "grid-cols-1",
              "landscape-phone:grid-cols-1 landscape-phone:gap-2 landscape-phone:flex-1 landscape-phone:min-h-0",
              "landscape-phone:auto-rows-fr",
            )}
          >
            <div
              className={cn(
                tile,
                "flex flex-col items-center justify-center text-center px-3 py-4 md:py-6 landscape-phone:py-1.5 min-h-0",
              )}
            >
              <span className="flex items-center text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <History className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 shrink-0" aria-hidden />
                Daily Pot Count
              </span>
              <span className="text-4xl md:text-5xl font-black tabular-nums leading-none mt-1 md:mt-2 text-slate-900 dark:text-slate-100">
                {status.dailyBrewCount}
              </span>
            </div>

            {showPrediction && predictedNextBrew && (
              <div
                className={cn(
                  "rounded-2xl backdrop-blur-md shadow-lg min-h-0",
                  "flex flex-col items-center justify-center text-center px-3 py-4 md:py-6 landscape-phone:py-1.5",
                  predictedNextBrew.isOverdue
                    ? "bg-amber-100/95 dark:bg-amber-950/90 ring-2 ring-amber-500"
                    : "bg-white/90 dark:bg-slate-900/90 ring-1 ring-black/5 dark:ring-white/10",
                )}
              >
                <h3
                  className={cn(
                    "flex items-center text-[11px] md:text-xs font-bold uppercase tracking-wider",
                    predictedNextBrew.isOverdue
                      ? "text-amber-900 dark:text-amber-200"
                      : "text-slate-600 dark:text-slate-400",
                  )}
                >
                  {predictedNextBrew.isOverdue ? (
                    <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
                  )}
                  {predictedNextBrew.isOverdue ? "Next Brew Overdue" : "Next Brew Predicted"}
                </h3>
                <span
                  className={cn(
                    "text-3xl md:text-5xl font-black tabular-nums tracking-tighter leading-none mt-1 md:mt-2",
                    predictedNextBrew.isOverdue
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-slate-900 dark:text-slate-100",
                  )}
                >
                  {predictedNextBrew.time}
                </span>
                <p
                  className={cn(
                    "text-[11px] md:text-xs font-bold uppercase tracking-wide mt-1",
                    predictedNextBrew.isOverdue
                      ? "text-amber-800 dark:text-amber-300"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {predictedNextBrew.isOverdue
                    ? `Should have been brewed ${formatMinsToDuration(predictedNextBrew.overdueMins)} ago`
                    : "Historical Estimate"}
                </p>
              </div>
            )}
          </div>

          {/* Brewer controls */}
          {adminPassword && (
            <div className="grid grid-cols-2 gap-3 md:gap-4 landscape-phone:gap-2">
              {BREW_BUTTONS.map(({ durationMs, label, sub, primary }) => (
                <button
                  key={durationMs}
                  type="button"
                  onClick={() => handleStartBrew(durationMs)}
                  disabled={isPending || isRecentlyBrewed}
                  className={cn(
                    "min-h-11 rounded-2xl px-2 py-3 md:py-5 landscape-phone:py-2 flex flex-col items-center justify-center text-center",
                    "text-white shadow-lg active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100",
                    primary
                      ? "bg-slate-900 dark:bg-black hover:bg-slate-800 dark:hover:bg-slate-950 ring-1 ring-white/10"
                      : "bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 ring-1 ring-white/10",
                  )}
                >
                  {isPending ? (
                    <RefreshCw className="w-6 h-6 animate-spin" aria-hidden />
                  ) : (
                    <>
                      <span className="text-sm md:text-xl landscape-phone:text-[13px] font-black uppercase tracking-tight leading-tight text-balance">
                        {isRecentlyBrewed ? "Brew Started" : label}
                      </span>
                      <span className="text-[11px] md:text-xs text-slate-300 font-bold mt-0.5 uppercase">
                        {isRecentlyBrewed ? "Cooldown active" : sub}
                      </span>
                    </>
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowWasteConfirm(true)}
                disabled={isWastePending}
                className={cn(
                  "col-span-2 min-h-11 rounded-2xl px-3 py-2 md:py-4 landscape-phone:py-1",
                  "flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all",
                  "bg-red-50/95 dark:bg-red-950/90 ring-1 ring-red-300 dark:ring-red-900 hover:bg-red-100 dark:hover:bg-red-900/80",
                )}
              >
                {isWastePending ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-red-600 dark:text-red-400" aria-hidden />
                ) : (
                  <>
                    <span className="flex items-center text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                      <Trash2 className="w-3.5 h-3.5 mr-1 shrink-0" aria-hidden />
                      Indicate Waste
                    </span>
                    <span className="text-base md:text-2xl landscape-phone:text-sm font-black uppercase tracking-tight leading-tight text-red-800 dark:text-red-300">
                      Poured in sink
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Links */}
          <div className="flex items-stretch gap-3 md:gap-4 landscape-phone:gap-2">
            <Link
              href="/analyze"
              className={cn(
                tile,
                "group flex-1 min-w-0 min-h-11 flex items-center justify-between px-4 py-3 md:py-4 landscape-phone:px-3 landscape-phone:py-2",
                "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100",
              )}
            >
              <span className="flex items-center gap-2 min-w-0 font-black uppercase text-[11px] md:text-sm tracking-widest landscape-phone:tracking-normal">
                <BarChart2 className="w-4 h-4 md:w-5 md:h-5 shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" aria-hidden />
                <span className="truncate">
                  <span className="landscape-phone:hidden">Analyze Consumption</span>
                  <span className="hidden landscape-phone:inline">Analytics</span>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:translate-x-1 transition-transform" aria-hidden />
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
              className={cn(
                tile,
                "shrink-0 w-11 min-h-11 md:w-14 flex items-center justify-center",
                "text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800",
              )}
            >
              <Github className="w-5 h-5" aria-hidden />
            </a>
          </div>
        </div>
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
