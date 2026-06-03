import { useQuery } from "@tanstack/react-query";
import { treasuryClient } from "@/lib/treasury-api";

export interface TreasuryHistoryPoint {
  date: string;
  totalBackingPerOhm: number;
  liquidBackingPerOhm: number;
  ohmPrice: number;
  backedSupply: number;
}

const MAX_CHART_POINTS = 180;

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

export function useTreasuryHistory(days = 7) {
  return useQuery<TreasuryHistoryPoint[]>({
    queryKey: ["treasuryHistory", "treasury-api", days],
    queryFn: async ({ signal }) => {
      const start = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];

      // autoPaginate splits ranges that exceed bounds.maxRangeDays (~366) into
      // parallel chunks — needed for the 5-year "Max" window the chart supports.
      const rows = await treasuryClient.getDailyMetrics({ start, autoPaginate: true, signal });

      const points = rows
        .filter((r) => r.crossChainComplete)
        .map((r) => {
          const totalBackingPerOhm =
            r.ohmBackedSupply > 0 ? r.treasuryMarketValue / r.ohmBackedSupply : 0;
          return {
            date: r.date,
            totalBackingPerOhm,
            liquidBackingPerOhm: r.treasuryLiquidBackingPerOhmBacked,
            ohmPrice: r.ohmPrice,
            backedSupply: r.ohmBackedSupply,
          };
        });

      return downsample(points);
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
