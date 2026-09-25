import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  icon: Icon,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 md:p-5 flex flex-col items-center justify-center text-center min-h-[8.5rem] border border-slate-200 dark:border-slate-700/60",
        className,
      )}
    >
      <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400 mb-2 shrink-0" />
      <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 tracking-wide mb-1 leading-tight">
        {label}
      </span>
      <span className={cn("text-3xl md:text-4xl font-black tabular-nums leading-none text-slate-900 dark:text-slate-100", valueClassName)}>
        {value}
      </span>
    </div>
  );
}
