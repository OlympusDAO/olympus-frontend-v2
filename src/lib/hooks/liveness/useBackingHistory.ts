import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants";

export interface BackingHistory {
  dataPoints: Array<{ date: string; backing: number }>;
  currentBacking: number;
  change7d: number; // percentage
}

export function useBackingHistory() {
  return useQuery<BackingHistory>({
    queryKey: ["backingHistory"],
    queryFn: async () => {
      const startDate = new Date(Date.now() - 90 * 86_400_000).toISOString().split("T")[0];
      const params = JSON.stringify({
        startDate,
        crossChainDataComplete: true,
        ignoreCache: false,
      });

      const response = await fetch(
        `${TREASURY_API_URL}/operations/paginated/metrics?wg_variables=${encodeURIComponent(params)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch backing history");

      const json = await response.json();
      const records: Array<{
        date: string;
        treasuryLiquidBackingPerOhmBacked: number;
      }> = json.data ?? [];

      records.sort((a, b) => a.date.localeCompare(b.date));

      const dataPoints = records.map((r) => ({
        date: r.date,
        backing: r.treasuryLiquidBackingPerOhmBacked || 0,
      }));

      const currentBacking = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].backing : 0;

      const sevenDaysAgoIdx = Math.max(0, dataPoints.length - 8);
      const change7d =
        dataPoints.length >= 8
          ? ((currentBacking - dataPoints[sevenDaysAgoIdx].backing) /
              dataPoints[sevenDaysAgoIdx].backing) *
            100
          : 0;

      return { dataPoints, currentBacking, change7d };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
