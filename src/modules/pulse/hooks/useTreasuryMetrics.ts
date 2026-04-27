import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants.ts";

interface TreasuryMetrics {
  ohmTotalSupply: number;
  ohmBackedSupply: number;
  treasuryMarketValue: number;
  treasuryLiquidBacking: number;
  treasuryLiquidBackingPerOhmBacked: number;
  ohmPrice: number;
}

export function useTreasuryMetrics() {
  return useQuery<TreasuryMetrics>({
    queryKey: ["treasuryMetrics"],
    queryFn: async () => {
      const response = await fetch(`${TREASURY_API_URL}/operations/latest/metrics`);
      if (!response.ok) throw new Error("Failed to fetch treasury metrics");

      const response_data = await response.json();
      const data = response_data.data || response_data;

      return {
        ohmTotalSupply: data.ohmTotalSupply || 0,
        ohmBackedSupply: data.ohmBackedSupply || 0,
        treasuryMarketValue: data.treasuryMarketValue || 0,
        treasuryLiquidBacking: data.treasuryLiquidBacking || 0,
        treasuryLiquidBackingPerOhmBacked: data.treasuryLiquidBackingPerOhmBacked || 0,
        ohmPrice: data.ohmPrice || 0,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
