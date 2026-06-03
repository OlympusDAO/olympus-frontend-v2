import { useQuery } from "@tanstack/react-query";
import { treasuryClient } from "@/lib/treasury-api";

export interface GohmPriceHistory {
  dataPoints: Array<{ date: string; price: number }>;
}

export function useGohmPriceHistory() {
  return useQuery<GohmPriceHistory>({
    queryKey: ["gohmPriceHistory", "treasury-api"],
    queryFn: async ({ signal }) => {
      const start = new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];
      const rows = await treasuryClient.getDailyMetrics({ start, signal });

      const dataPoints = rows
        .map((r) => ({ date: r.date, price: r.gOhmPrice }))
        .filter((p) => p.price > 0);

      return { dataPoints };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
