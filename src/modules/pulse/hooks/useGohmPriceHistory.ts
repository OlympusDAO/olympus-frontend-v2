import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants.ts";

export interface GohmPriceHistory {
  dataPoints: Array<{ date: string; price: number }>;
  currentPrice: number;
  change24h: number;
  change7d: number;
}

export function useGohmPriceHistory() {
  return useQuery<GohmPriceHistory>({
    queryKey: ["gohmPriceHistory"],
    queryFn: async () => {
      const startDate = new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];
      const params = JSON.stringify({
        startDate,
        crossChainDataComplete: true,
        ignoreCache: false,
      });

      const response = await fetch(
        `${TREASURY_API_URL}/operations/paginated/metrics?wg_variables=${encodeURIComponent(params)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch gOHM price history");

      const json = await response.json();
      const records: Array<{ date: string; gOhmPrice: number }> = json.data ?? [];

      records.sort((a, b) => a.date.localeCompare(b.date));

      const dataPoints = records.map((r) => ({
        date: r.date,
        price: r.gOhmPrice || 0,
      }));

      const currentPrice = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].price : 0;

      const change24h =
        dataPoints.length >= 2
          ? ((dataPoints[dataPoints.length - 1].price - dataPoints[dataPoints.length - 2].price) /
              dataPoints[dataPoints.length - 2].price) *
            100
          : 0;

      const sevenDaysAgoIdx = Math.max(0, dataPoints.length - 8);
      const change7d =
        dataPoints.length >= 8
          ? ((currentPrice - dataPoints[sevenDaysAgoIdx].price) /
              dataPoints[sevenDaysAgoIdx].price) *
            100
          : 0;

      return { dataPoints, currentPrice, change24h, change7d };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
