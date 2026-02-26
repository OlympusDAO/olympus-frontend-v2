import { useQuery } from "@tanstack/react-query";

const TREASURY_API_URL = "https://olympus-treasury-subgraph-prod.web.app";

interface TreasuryMetrics {
  ohmBackedSupply: number;
  treasuryLiquidBacking: number;
  treasuryLiquidBackingPerOhmBacked: number;
}

export function useTreasuryMetrics() {
  return useQuery<TreasuryMetrics>({
    queryKey: ["treasuryMetrics"],
    queryFn: async () => {
      const response = await fetch(`${TREASURY_API_URL}/operations/latest/metrics`);

      if (!response.ok) {
        throw new Error("Failed to fetch treasury metrics");
      }

      const response_data = await response.json();
      // API returns { data: { ... } } structure
      const data = response_data.data || response_data;

      return {
        ohmBackedSupply: data.ohmBackedSupply || 0,
        treasuryLiquidBacking: data.treasuryLiquidBacking || 0,
        treasuryLiquidBackingPerOhmBacked: data.treasuryLiquidBackingPerOhmBacked || 0,
      };
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
