"use client";

import { useState, useId, useEffect } from "react";
import { ChevronDown, ChevronUp, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const storageKey = `collapsible_section_${title.toLowerCase().replace(/\s+/g, "_")}`;

  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (savedState !== null) {
      // Read after mount (not in the initializer) to keep SSR hydration consistent
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(savedState === "open");
    }
  }, [storageKey]);

  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem(storageKey, newState ? "open" : "collapsed");
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm",
        className
      )}
    >
      <button
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center justify-between px-5 py-5 md:px-8 md:py-6 transition-colors group rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 md:w-6 md:h-6 shrink-0 text-slate-900 dark:text-slate-100 group-hover:scale-110 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all duration-300" />
          <h3 className="text-left text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div
          id={contentId}
          className="px-5 pb-5 md:px-8 md:pb-8 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {children}
        </div>
      )}
    </div>
  );
}
