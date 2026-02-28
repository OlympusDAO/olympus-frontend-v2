import { getWeekStartUTC } from "./epoch";

/**
 * Interpolate revenue earned since the start of the current week
 * based on a weekly rate. Updates smoothly between polls.
 */
export function interpolateWeeklyRevenue(weeklyRate: number): number {
  const weekStart = getWeekStartUTC();
  const now = Date.now();
  const elapsed = now - weekStart.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return weeklyRate * Math.min(elapsed / weekMs, 1);
}

/**
 * Interpolate revenue earned today based on a daily rate
 */
export function interpolateDailyRevenue(dailyRate: number): number {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const elapsed = now.getTime() - startOfDay.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return dailyRate * Math.min(elapsed / dayMs, 1);
}

/**
 * Get the per-second rate from a weekly total
 */
export function weeklyToPerSecond(weeklyRate: number): number {
  return weeklyRate / (7 * 24 * 60 * 60);
}
