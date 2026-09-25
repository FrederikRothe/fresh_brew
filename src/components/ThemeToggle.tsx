"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  /**
   * `floating` pins the toggle to the bottom-left corner (safe-area aware).
   * `inline` renders a regular 44px icon button for use inside layouts.
   */
  variant?: "floating" | "inline";
  className?: string;
};

const readTheme = (): "light" | "dark" =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export default function ThemeToggle({
  variant = "floating",
  className,
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // Dark is the default; only an explicit saved choice switches to light.
    // (The inline script in layout.tsx already applied this before first paint.)
    const initialTheme: "light" | "dark" =
      localStorage.getItem("theme") === "light" ? "light" : "dark";

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initialTheme);
    document.documentElement.classList.add(initialTheme);
    document.documentElement.classList.remove(initialTheme === "dark" ? "light" : "dark");
    document.documentElement.classList.add("transition-colors", "duration-300");

    // Keep multiple toggle instances (e.g. layout + dashboard) in sync.
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const newTheme = readTheme() === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  };

  const baseClass =
    variant === "floating"
      ? cn(
          "fixed z-40 inline-flex items-center justify-center w-11 h-11 rounded-full",
          "bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))]",
          "bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-lg",
          "ring-1 ring-slate-300 dark:ring-slate-600",
          "text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-700",
        )
      : cn(
          "inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-xl",
          "bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700",
          "text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
        );

  // Avoid hydration mismatch by not rendering the icon until theme is loaded.
  // The placeholder keeps the same positioning so it never shifts the layout.
  if (!theme) {
    return (
      <div
        aria-hidden
        className={cn(baseClass, "opacity-0", className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(baseClass, "active:scale-95", className)}
      aria-label="Toggle Dark Mode"
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5" aria-hidden />
      ) : (
        <Sun className="w-5 h-5 text-amber-400" aria-hidden />
      )}
    </button>
  );
}
