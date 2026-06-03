import { useQuery } from "@tanstack/react-query";
import { treasuryClient } from "@/lib/treasury-api";

interface TreasuryMetrics {
  ohmTotalSupply: number;
  ohmCirculatingSupply: number;
  ohmBackedSupply: number;
  treasuryMarketValue: number;
  treasuryLiquidBacking: number;
  treasuryLiquidBackingPerOhmBacked: number;
  ohmPrice: number;
}

const EMPTY: TreasuryMetrics = {
  ohmTotalSupply: 0,
  ohmCirculatingSupply: 0,
  ohmBackedSupply: 0,
  treasuryMarketValue: 0,
  treasuryLiquidBacking: 0,
  treasuryLiquidBackingPerOhmBacked: 0,
  ohmPrice: 0,
};

// How many days back from `latestDate` we'll scan looking for a cross-chain-
// complete row. The publisher typically finalises within ≤ 1 day; 5 is
// generous and still one round trip.
const LOOKBACK_DAYS = 5;

export function useTreasuryMetrics() {
  return useQuery<TreasuryMetrics>({
    queryKey: ["treasuryMetrics", "treasury-api"],
    queryFn: async ({ signal }) => {
      const bounds = await treasuryClient.getCachedBounds();
      const end = bounds.latestDate;
      const start = new Date(new Date(`${end}T00:00:00Z`).getTime() - LOOKBACK_DAYS * 86_400_000)
        .toISOString()
        .split("T")[0];

      const rows = await treasuryClient.getDailyMetrics({ start, end, signal });

      // Walk back from the newest row to find the freshest cross-chain-complete day.
      const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));
      const row = sorted.find((r) => r.crossChainComplete) ?? sorted[0];
      if (!row) return EMPTY;

      return {
        ohmTotalSupply: row.ohmTotalSupply,
        ohmCirculatingSupply: row.ohmCirculatingSupply,
        ohmBackedSupply: row.ohmBackedSupply,
        treasuryMarketValue: row.treasuryMarketValue,
        treasuryLiquidBacking: row.treasuryLiquidBacking,
        treasuryLiquidBackingPerOhmBacked: row.treasuryLiquidBackingPerOhmBacked,
        ohmPrice: row.ohmPrice,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
