import { useState, useEffect, useCallback } from "react";
import { useWeeklyRevenue } from "./useWeeklyRevenue.ts";
import { getWeekStartUTC } from "@/lib/liveness/epoch.ts";

type TimeWindow = "daily" | "weekly" | "annualized";

export function useRevenueCounter() {
  const revenue = useWeeklyRevenue();
  const [displayValue, setDisplayValue] = useState(0);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("weekly");

  const getDisplayValue = useCallback(() => {
    if (!revenue) return 0;

    const now = Date.now();

    switch (timeWindow) {
      case "daily": {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const elapsedMs = now - startOfDay.getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        return revenue.dailyRate * Math.min(elapsedMs / dayMs, 1);
      }
      case "weekly": {
        const weekStart = getWeekStartUTC();
        const elapsedMs = now - weekStart.getTime();
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        return revenue.totalWeekly * Math.min(elapsedMs / weekMs, 1);
      }
      case "annualized":
        return revenue.totalWeekly * 52;
    }
  }, [revenue, timeWindow]);

  useEffect(() => {
    if (!revenue) return;

    // For annualized, just set once (no animation needed)
    if (timeWindow === "annualized") {
      setDisplayValue(revenue.totalWeekly * 52);
      return;
    }

    // Update every 30s to match revenue fetch interval
    const interval = setInterval(() => {
      setDisplayValue(getDisplayValue());
    }, 30_000);

    // Set initial value immediately
    setDisplayValue(getDisplayValue());

    return () => clearInterval(interval);
  }, [revenue, timeWindow, getDisplayValue]);

  return {
    displayValue,
    timeWindow,
    setTimeWindow,
    weeklyTotal: revenue?.totalWeekly ?? 0,
    dailyRate: revenue?.dailyRate ?? 0,
    sources: revenue?.sources ?? [],
    lpBreakdown: revenue?.lpBreakdown ?? [],
    isLoading: !revenue,
  };
}
