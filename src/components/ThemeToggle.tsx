"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | "netlight" | null>(null);

  useEffect(() => {
    // Initial theme detection
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "netlight" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initialTheme = savedTheme || systemTheme;
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initialTheme);
    document.documentElement.classList.add(initialTheme);
    ["light", "dark", "netlight"].forEach(t => {
      if (t !== initialTheme) document.documentElement.classList.remove(t);
    });
    document.documentElement.classList.add("transition-colors", "duration-300");
  }, []);

  const toggleTheme = () => {
    let newTheme: "light" | "dark" | "netlight";
    if (theme === "light") newTheme = "dark";
    else if (theme === "dark") newTheme = "netlight";
    else newTheme = "light";

    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    ["light", "dark", "netlight"].forEach(t => {
      if (t === newTheme) {
        document.documentElement.classList.add(t);
      } else {
        document.documentElement.classList.remove(t);
      }
    });
  };

  // Avoid hydration mismatch by not rendering the icon until theme is loaded
  if (!theme) return <div className="w-10 h-10" />;

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "fixed bottom-4 left-4 z-50 p-2 rounded-lg",
        "text-slate-400 dark:text-slate-600 netlight:text-nl-purple-d hover:text-slate-600 dark:hover:text-slate-400 netlight:hover:text-nl-purple",
        "opacity-50 hover:opacity-100 transition-opacity",
        "active:scale-95"
      )}
      aria-label="Toggle Theme"
    >
      {theme === "light" ? (
        <Moon className="w-4 h-4 rotate-0 hover:-rotate-12" />
      ) : theme === "dark" ? (
        <Sun className="w-4 h-4 rotate-0 hover:rotate-90 text-amber-400" />
      ) : (
        <span className="font-black text-xs">N</span>
      )}
    </button>
  );
}
