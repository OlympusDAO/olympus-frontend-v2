import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants";

export interface OhmPriceHistory {
  dataPoints: Array<{ date: string; price: number }>;
  currentPrice: number;
  change24h: number; // percentage
  change7d: number; // percentage
}

export function useOhmPriceHistory() {
  return useQuery<OhmPriceHistory>({
    queryKey: ["ohmPriceHistory"],
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
      if (!response.ok) throw new Error("Failed to fetch price history");

      const json = await response.json();
      const records: Array<{ date: string; ohmPrice: number }> = json.data ?? [];

      // Sort ascending by date
      records.sort((a, b) => a.date.localeCompare(b.date));

      const dataPoints = records.map((r) => ({
        date: r.date,
        price: r.ohmPrice || 0,
      }));

      const currentPrice = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].price : 0;

      // 24h change: compare last two data points
      const change24h =
        dataPoints.length >= 2
          ? ((dataPoints[dataPoints.length - 1].price - dataPoints[dataPoints.length - 2].price) /
              dataPoints[dataPoints.length - 2].price) *
            100
          : 0;

      // 7d change: compare current to ~7 days ago
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
