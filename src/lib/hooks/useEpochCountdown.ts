import { useState, useEffect } from "react";
import { differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
}

export function useEpochCountdown(endTimestamp?: number): CountdownResult {
  const calculateTimeLeft = (target: Date): CountdownResult => ({
    days: Math.max(0, differenceInDays(target, new Date())),
    hours: Math.max(0, differenceInHours(target, new Date()) % 24),
    minutes: Math.max(0, differenceInMinutes(target, new Date()) % 60),
  });

  const [timeLeft, setTimeLeft] = useState<CountdownResult>({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (!endTimestamp) return;
    const target = new Date(endTimestamp * 1000);
    setTimeLeft(calculateTimeLeft(target));
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft(target)), 60_000);
    return () => clearInterval(timer);
  }, [endTimestamp]);

  return timeLeft;
}
