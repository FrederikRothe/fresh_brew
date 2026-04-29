import { useEffect } from "react";

const colorMap: Record<string, string> = {
  "bg-slate-500": "#64748b",
  "bg-blue-500": "#3b82f6",
  "bg-emerald-500": "#10b981",
  "bg-amber-500": "#f59e0b",
  "bg-rose-500": "#f43f5e",
};

const netlightColorMap: Record<string, string> = {
  "bg-slate-500": "#6664F1", // nl-purple-d
  "bg-blue-500": "#A29AFF",  // nl-purple
  "bg-emerald-500": "#7FFF78", // nl-green
  "bg-amber-500": "#FFF400",  // nl-yellow
  "bg-rose-500": "#FFA740",   // nl-orange
};

export function useBodyBackground(statusColor: string) {
  useEffect(() => {
    const colorClasses = Object.keys(colorMap);

    const updateBodyStyle = () => {
      const isNetlight = document.documentElement.classList.contains("netlight");
      const isDark =
        document.documentElement.classList.contains("dark") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches &&
          !document.documentElement.classList.contains("light"));
      
      const fallback = isNetlight ? "#050510" : (isDark ? "#0a0a0a" : "#ffffff");

      const mapToUse = isNetlight ? netlightColorMap : colorMap;
      document.body.style.backgroundColor = mapToUse[statusColor] || fallback;
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
