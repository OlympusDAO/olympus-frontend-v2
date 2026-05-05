import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants.ts";

export interface TreasuryHistoryPoint {
  date: string;
  totalBackingPerOhm: number;
  liquidBackingPerOhm: number;
  ohmPrice: number;
  backedSupply: number;
}

const MAX_CHART_POINTS = 180;
const CACHE_PREFIX = "pulse:treasury-history:v3:";

function getCacheKey(days: number) {
  return `${CACHE_PREFIX}${days}`;
}

function downsample(points: TreasuryHistoryPoint[], maxPoints = MAX_CHART_POINTS) {
  if (points.length <= maxPoints) return points;

  const sampled: TreasuryHistoryPoint[] = [];
  const lastIndex = points.length - 1;

  for (let i = 0; i < maxPoints; i++) {
    const sourceIndex = Math.round((i / (maxPoints - 1)) * lastIndex);
    sampled.push(points[sourceIndex]);
  }

  return sampled;
}

function readCachedHistory(days: number): TreasuryHistoryPoint[] | undefined {
  if (typeof window === "undefined") return undefined;

  const fallbackDays = [days, ...(days > 365 ? [365] : []), ...(days > 30 ? [30] : [])];

  for (const fallbackDay of fallbackDays) {
    const raw = window.localStorage.getItem(getCacheKey(fallbackDay));
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as TreasuryHistoryPoint[];
      if (Array.isArray(parsed) && parsed.length > 1) return parsed;
    } catch {
      window.localStorage.removeItem(getCacheKey(fallbackDay));
    }
  }

  return undefined;
}

function writeCachedHistory(days: number, points: TreasuryHistoryPoint[]) {
  if (typeof window === "undefined" || points.length <= 1) return;

  try {
    window.localStorage.setItem(getCacheKey(days), JSON.stringify(points));
  } catch {
    // Best-effort UI cache only. Ignore quota/privacy-mode failures.
  }
}

async function fetchWithTimeout(url: string, signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function useTreasuryHistory(days = 7) {
  return useQuery<TreasuryHistoryPoint[]>({
    queryKey: ["treasuryHistory", days],
    queryFn: async ({ signal }) => {
      const startDate = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];
      const params = JSON.stringify({
        startDate,
        crossChainDataComplete: true,
        ignoreCache: false,
      });

      const response = await fetchWithTimeout(
        `${TREASURY_API_URL}/operations/paginated/metrics?wg_variables=${encodeURIComponent(params)}`,
        signal,
        days > 365 ? 120_000 : 30_000,
      );
      if (!response.ok) throw new Error("Failed to fetch treasury history");

      const json = await response.json();
      const records: Array<{
        date: string;
        treasuryLiquidBacking: number;
        treasuryLiquidBackingPerOhmBacked?: number;
        ohmBackedSupply: number;
        ohmPrice: number;
        treasuryMarketValue: number;
      }> = json.data ?? [];

      records.sort((a, b) => a.date.localeCompare(b.date));

      const points = downsample(
        records.map((r) => {
          const backedSupply = r.ohmBackedSupply || 0;
          const liquidBackingPerOhm =
            r.treasuryLiquidBackingPerOhmBacked ??
            (backedSupply > 0 ? (r.treasuryLiquidBacking || 0) / backedSupply : 0);
          const totalBackingPerOhm =
            backedSupply > 0 ? (r.treasuryMarketValue || 0) / backedSupply : 0;

          return {
            date: r.date,
            totalBackingPerOhm,
            liquidBackingPerOhm,
            ohmPrice: r.ohmPrice || 0,
            backedSupply,
          };
        }),
      );

      writeCachedHistory(days, points);
      return points;
    },
    initialData: () => readCachedHistory(days),
    initialDataUpdatedAt: 0,
    staleTime: 300_000,
    refetchInterval: 600_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
}
