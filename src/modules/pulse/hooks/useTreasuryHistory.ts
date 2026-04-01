import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants.ts";

export interface TreasuryHistoryPoint {
  date: string;
  liquidBacking: number;
  backedSupply: number;
}

export function useTreasuryHistory(days = 7) {
  return useQuery<TreasuryHistoryPoint[]>({
    queryKey: ["treasuryHistory", days],
    queryFn: async () => {
      const startDate = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];
      const params = JSON.stringify({
        startDate,
        crossChainDataComplete: true,
        ignoreCache: false,
      });

      const response = await fetch(
        `${TREASURY_API_URL}/operations/paginated/metrics?wg_variables=${encodeURIComponent(params)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch treasury history");

      const json = await response.json();
      const records: Array<{
        date: string;
        treasuryLiquidBacking: number;
        ohmBackedSupply: number;
      }> = json.data ?? [];

      records.sort((a, b) => a.date.localeCompare(b.date));

      return records.map((r) => ({
        date: r.date,
        liquidBacking: r.treasuryLiquidBacking || 0,
        backedSupply: r.ohmBackedSupply || 0,
      }));
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
