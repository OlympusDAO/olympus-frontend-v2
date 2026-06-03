import { useQuery } from "@tanstack/react-query";
import { treasurySubgraphClient } from "@/lib/treasury-subgraph-client";

export interface TreasuryIndexingProgress {
  chain: string;
  date: string;
  block: number;
  timestamp: number;
  daysBehind: number;
}

const MS_PER_DAY = 86_400_000;

export function useTreasuryDataFreshness() {
  return useQuery<TreasuryIndexingProgress[]>({
    queryKey: ["treasuryDataFreshness", "treasury-subgraph"],
    queryFn: async () => {
      const bounds = await treasurySubgraphClient.getBounds();
      const latestMs = Date.parse(bounds.latestDate);
      const progress = bounds.indexingProgress?.chains ?? {};

      return Object.entries(progress)
        .map(([chain, chainProgress]) => {
          if (!chainProgress) return undefined;
          const chainMs = Date.parse(chainProgress.date);
          const daysBehind =
            Number.isFinite(latestMs) && Number.isFinite(chainMs)
              ? Math.max(0, Math.round((latestMs - chainMs) / MS_PER_DAY))
              : 0;

          return {
            chain,
            date: chainProgress.date,
            block: chainProgress.block,
            timestamp: chainProgress.timestamp,
            daysBehind,
          };
        })
        .filter((item): item is TreasuryIndexingProgress => item !== undefined)
        .sort((a, b) => b.daysBehind - a.daysBehind || a.chain.localeCompare(b.chain));
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
