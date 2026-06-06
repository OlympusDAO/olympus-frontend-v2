import { useQuery } from "@tanstack/react-query";
import { treasurySubgraphClient } from "@/lib/treasury-subgraph-client";
import { parseEnvioNumber } from "@/lib/utils/envio";

export interface BackingHistory {
  dataPoints: Array<{ date: string; backing: number; ohmPrice: number }>;
}

export function useBackingHistory(days = 90) {
  return useQuery<BackingHistory>({
    queryKey: ["backingHistory", "treasury-subgraph", days],
    queryFn: async () => {
      const start = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];
      const rows = (
        await treasurySubgraphClient.getDailyMetrics({ start, autoPaginate: true })
      ).filter((r) => r.crossChainComplete);

      const dataPoints = rows
        .map((r) => ({
          date: r.date,
          backing: parseEnvioNumber(r.treasuryLiquidBackingPerOhmBacked),
          ohmPrice: parseEnvioNumber(r.ohmPrice),
        }))
        .filter((p) => p.backing > 0);

      return { dataPoints };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
