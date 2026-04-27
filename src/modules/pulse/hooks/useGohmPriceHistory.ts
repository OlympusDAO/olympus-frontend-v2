import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants.ts";

export interface GohmPriceHistory {
  dataPoints: Array<{ date: string; price: number }>;
}

export function useGohmPriceHistory() {
  return useQuery<GohmPriceHistory>({
    queryKey: ["gohmPriceHistory"],
    queryFn: async () => {
      const startDate = new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];
      const params = JSON.stringify({
        startDate,
        ignoreCache: false,
      });

      const response = await fetch(
        `${TREASURY_API_URL}/operations/paginated/metrics?wg_variables=${encodeURIComponent(params)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch gOHM price history");

      const json = await response.json();
      const records: Array<{ date: string; gOhmPrice: number }> = json.data ?? [];

      records.sort((a, b) => a.date.localeCompare(b.date));

      const dataPoints = records
        .filter((r) => (r.gOhmPrice ?? 0) > 0)
        .map((r) => ({ date: r.date, price: r.gOhmPrice }));

      return { dataPoints };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
