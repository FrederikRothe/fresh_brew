"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-2xl">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              {title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {message}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold uppercase text-xs tracking-widest hover:bg-red-700 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
            >
              Yes, confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
