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
        "bg-white dark:bg-slate-900 rounded-2xl p-6 flex flex-col items-center border border-slate-200 dark:border-slate-800 shadow-sm",
        className,
      )}
    >
      <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500 mb-2" />
      <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1">
        {label}
      </span>
      <span className={cn("text-2xl md:text-4xl font-black text-slate-900 dark:text-slate-100", valueClassName)}>
        {value}
      </span>
    </div>
  );
}
