import {
  RESET_THRESHOLD_MS,
  FRESH_THRESHOLD_MS,
  SOUR_THRESHOLD_MS,
} from "./constants";

export type BrewState = {
  statusText: string;
  statusColor: string;
  message: string;
  labelText: string;
  displayHours: number;
  displayMins: number;
  displaySecs: number;
  isReset: boolean;
};

export function computeBrewState(
  elapsedMs: number,
  brewDurationMs: number,
): BrewState {
  if (elapsedMs >= RESET_THRESHOLD_MS) {
    return {
      statusText: "STALE / EMPTY",
      statusColor: "bg-slate-500",
      message: "It's about that time.",
      labelText: "Freshness Timer",
      displayHours: 0,
      displayMins: 0,
      displaySecs: 0,
      isReset: true,
    };
  }

  if (elapsedMs < brewDurationMs) {
    const remainingMs = Math.max(0, brewDurationMs - elapsedMs);
    return {
      statusText: "BREWING...",
      statusColor: "bg-blue-500",
      message: "Patience, the magic is happening.",
      labelText: "Brewing Countdown",
      displayHours: Math.floor(remainingMs / 3600000),
      displayMins: Math.floor((remainingMs % 3600000) / 60000),
      displaySecs: Math.floor((remainingMs % 60000) / 1000),
      isReset: false,
    };
  }

  const sinceReadyMs = elapsedMs - brewDurationMs;
  const base = {
    labelText: "Time Since Ready",
    displayHours: Math.floor(sinceReadyMs / 3600000),
    displayMins: Math.floor((sinceReadyMs % 3600000) / 60000),
    displaySecs: Math.floor((sinceReadyMs % 60000) / 1000),
    isReset: false,
  };

  if (sinceReadyMs < FRESH_THRESHOLD_MS) {
    return {
      ...base,
      statusText: "FRESH!",
      statusColor: "bg-emerald-500",
      message: "Brewed recently. Enjoy!",
    };
  }
  if (sinceReadyMs < SOUR_THRESHOLD_MS) {
    return {
      ...base,
      statusText: "GETTING SOUR",
      statusColor: "bg-amber-500",
      message: "Getting there, but still tasty.",
    };
  }
  return {
    ...base,
    statusText: "STALE",
    statusColor: "bg-rose-500",
    message: "Running low or getting cold.",
  };
}
