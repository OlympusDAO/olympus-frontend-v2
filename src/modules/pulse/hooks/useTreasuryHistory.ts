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
    queryKey: ["treasuryHistory", days],
    queryFn: async ({ signal }) => {
      const startDate = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];
      const params = JSON.stringify({
        startDate,
        crossChainDataComplete: true,
        ignoreCache: false,
      });

      const response = await fetch(
        `${TREASURY_API_URL}/operations/paginated/metrics?wg_variables=${encodeURIComponent(params)}`,
        { signal },
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

      return downsample(
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
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
