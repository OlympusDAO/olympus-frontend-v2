import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number of months into a short term suffix (e.g., "1m", "3m", "6m")
 */
export function formatTermSuffix(months: number): string {
  return `${months}m`;
}

/**
 * Formats a number of months into a human-readable period display name
 * (e.g., "1 month", "3 months", "1 year", "1y 6m")
 */
export function formatPeriodDisplayName(months: number): string {
  if (months === 1) return "1 month";
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return years === 1 ? "1 year" : `${years} years`;
  } else {
    return `${years}y ${remainingMonths}m`;
  }
}

/**
 * Creates a display name for a token with term suffix (e.g., "USDS-3m", "cdUSDS-6m")
 */
export function createTokenDisplayName(baseSymbol: string, periodMonths: number): string {
  const termSuffix = formatTermSuffix(periodMonths);
  return `${baseSymbol}-${termSuffix}`;
}
