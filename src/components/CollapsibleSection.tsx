"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6 text-slate-900 dark:text-slate-100 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
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
        <div className="p-6 md:p-8 pt-0 md:pt-0 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
