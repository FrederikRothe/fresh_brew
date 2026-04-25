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
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initialTheme);
    document.documentElement.classList.add(initialTheme);
    document.documentElement.classList.remove(initialTheme === "dark" ? "light" : "dark");
    document.documentElement.classList.add("transition-colors", "duration-300");
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
        "fixed bottom-4 left-4 z-50 p-2 rounded-lg",
        "text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400",
        "opacity-50 hover:opacity-100 transition-opacity",
        "active:scale-95"
      )}
      aria-label="Toggle Dark Mode"
    >
      {theme === "light" ? (
        <Moon className="w-4 h-4 rotate-0 hover:-rotate-12" />
      ) : (
        <Sun className="w-4 h-4 rotate-0 hover:rotate-90 text-amber-400" />
      )}
    </button>
  );
}
