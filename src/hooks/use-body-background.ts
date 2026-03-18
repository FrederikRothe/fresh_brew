import { useEffect } from "react";

const colorMap: Record<string, string> = {
  "bg-slate-500": "#64748b",
  "bg-blue-500": "#3b82f6",
  "bg-emerald-500": "#10b981",
  "bg-amber-500": "#f59e0b",
  "bg-rose-500": "#f43f5e",
};

export function useBodyBackground(statusColor: string) {
  useEffect(() => {
    const colorClasses = Object.keys(colorMap);

    const updateBodyStyle = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches &&
          !document.documentElement.classList.contains("light"));
      const fallback = isDark ? "#0a0a0a" : "#ffffff";

      document.body.style.backgroundColor = colorMap[statusColor] || fallback;
      document.body.classList.remove(...colorClasses);
      document.body.classList.add(statusColor);
    };

    updateBodyStyle();

    const observer = new MutationObserver(updateBodyStyle);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      document.body.classList.remove(...colorClasses);
      document.body.style.backgroundColor = "";
    };
  }, [statusColor]);
}
