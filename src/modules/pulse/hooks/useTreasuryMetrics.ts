import { useQuery } from "@tanstack/react-query";
import { treasurySubgraphClient } from "@/lib/treasury-subgraph-client";
import { parseEnvioNumber } from "@/lib/utils/envio";

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

export function useTreasuryMetrics() {
  return useQuery<TreasuryMetrics>({
    queryKey: ["treasuryMetrics", "treasury-subgraph"],
    queryFn: async () => {
      const bounds = await treasurySubgraphClient.getBounds();
      const rows = await treasurySubgraphClient.getDailyMetrics({
        start: bounds.latestDate,
        end: bounds.latestDate,
      });
      const row = rows.find((r) => r.crossChainComplete) ?? rows[0];
      if (!row) return EMPTY;

      return {
        ohmTotalSupply: parseEnvioNumber(row.ohmTotalSupply),
        ohmCirculatingSupply: parseEnvioNumber(row.ohmCirculatingSupply),
        ohmBackedSupply: parseEnvioNumber(row.ohmBackedSupply),
        treasuryMarketValue: parseEnvioNumber(row.treasuryMarketValue),
        treasuryLiquidBacking: parseEnvioNumber(row.treasuryLiquidBacking),
        treasuryLiquidBackingPerOhmBacked: parseEnvioNumber(row.treasuryLiquidBackingPerOhmBacked),
        ohmPrice: parseEnvioNumber(row.ohmPrice),
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
