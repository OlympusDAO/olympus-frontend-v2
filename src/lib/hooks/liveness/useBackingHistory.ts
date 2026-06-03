import { useQuery } from "@tanstack/react-query";
import { treasuryClient } from "@/lib/treasury-api";

export interface BackingHistory {
  dataPoints: Array<{ date: string; backing: number; ohmPrice: number }>;
}

export function useBackingHistory(days = 90) {
  return useQuery<BackingHistory>({
    queryKey: ["backingHistory", "treasury-api", days],
    queryFn: async ({ signal }) => {
      const start = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];

      const rows = await treasuryClient.getDailyMetrics({ start, signal });

      const dataPoints = rows
        .filter((r) => r.crossChainComplete)
        .map((r) => ({
          date: r.date,
          backing: r.treasuryLiquidBackingPerOhmBacked,
          ohmPrice: r.ohmPrice,
        }))
        .filter((p) => p.backing > 0);

      return { dataPoints };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
