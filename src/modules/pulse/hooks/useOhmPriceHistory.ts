import { useQuery } from "@tanstack/react-query";
import { treasuryClient } from "@/lib/treasury-api";

export interface OhmPriceHistory {
  dataPoints: Array<{ date: string; price: number }>;
}

export function useOhmPriceHistory(days = 30) {
  return useQuery<OhmPriceHistory>({
    queryKey: ["ohmPriceHistory", "treasury-api", days],
    queryFn: async ({ signal }) => {
      const start = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];
      const rows = await treasuryClient.getDailyMetrics({ start, signal });

      const dataPoints = rows
        .map((r) => ({ date: r.date, price: r.ohmPrice }))
        .filter((p) => p.price > 0);

      return { dataPoints };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
