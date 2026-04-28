import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants.ts";

export interface OhmPriceHistory {
  dataPoints: Array<{ date: string; price: number }>;
}

export function useOhmPriceHistory(days = 30) {
  return useQuery<OhmPriceHistory>({
    queryKey: ["ohmPriceHistory", days],
    queryFn: async () => {
      const startDate = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];
      const params = JSON.stringify({
        startDate,
        ignoreCache: false,
      });

      const response = await fetch(
        `${TREASURY_API_URL}/operations/paginated/metrics?wg_variables=${encodeURIComponent(params)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch price history");

      const json = await response.json();
      const records: Array<{ date: string; ohmPrice: number }> = json.data ?? [];

      records.sort((a, b) => a.date.localeCompare(b.date));

      const dataPoints = records
        .filter((r) => (r.ohmPrice ?? 0) > 0)
        .map((r) => ({ date: r.date, price: r.ohmPrice }));

      return { dataPoints };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
