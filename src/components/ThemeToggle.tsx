"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // Initial theme detection
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initialTheme = savedTheme || systemTheme;
    
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
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

  // Avoid hydration mismatch by not rendering the icon until theme is loaded
  if (!theme) return <div className="w-10 h-10" />;

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "fixed top-4 left-4 z-50 p-2.5 rounded-xl",
        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md",
        "border border-slate-200 dark:border-slate-800",
        "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
        "shadow-sm hover:shadow-md active:scale-95"
      )}
      aria-label="Toggle Dark Mode"
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5 transition-transform duration-500 rotate-0 hover:-rotate-12" />
      ) : (
        <Sun className="w-5 h-5 transition-transform duration-500 rotate-0 hover:rotate-90 text-amber-400" />
      )}
    </button>
  );
}
