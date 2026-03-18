import { useState, useEffect } from "react";
import { getBrewStatus, type BrewStatus } from "@/app/actions";

export function useBrewStatus(initialStatus: BrewStatus) {
  const [status, setStatus] = useState<BrewStatus>(initialStatus);

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const newStatus = await getBrewStatus();
        if (
          newStatus.lastBrewTimestamp &&
          newStatus.lastBrewTimestamp > (status.lastBrewTimestamp || 0)
        ) {
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("☕ Fresh Brew Dispatched!", {
              body: `Pot #${newStatus.dailyBrewCount} is now brewing!`,
            });
          }
          setStatus(newStatus);
        } else if (newStatus.lastBrewTimestamp !== status.lastBrewTimestamp) {
          setStatus(newStatus);
        }
      } catch (error) {
        console.error("Failed to poll brew status:", error);
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [status.lastBrewTimestamp]);

  return { status, setStatus };
}
