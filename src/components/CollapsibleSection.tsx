"use client";

import { useState, useId } from "react";
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

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm",
        className
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center justify-between p-6 md:p-8 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6 text-slate-900 dark:text-slate-100 group-hover:scale-110 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all duration-300" />
          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div
          id={contentId}
          className="p-6 md:p-8 pt-0 md:pt-0 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {children}
        </div>
      )}
    </div>
  );
}
