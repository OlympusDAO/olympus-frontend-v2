import { useQuery } from "@tanstack/react-query";
import { treasuryClient } from "@/lib/treasury-api";

export interface LaggingChain {
  chain: string;
  date: string;
  daysBehind: number;
}

const MS_PER_DAY = 86_400_000;

export function useTreasuryDataFreshness() {
  return useQuery<LaggingChain[]>({
    queryKey: ["treasuryDataFreshness", "treasury-api"],
    queryFn: async ({ signal }) => {
      const bounds = await treasuryClient.getBounds(signal);
      const chains = bounds.indexingProgress?.chains ?? {};

      const rows = Object.entries(chains)
        .filter(([, progress]) => progress !== undefined)
        .map(([chain, progress]) => ({ chain, date: progress!.date }));
      if (rows.length === 0) return [];

      const latestDate = rows.reduce((max, r) => (r.date > max ? r.date : max), "");
      const latestMs = Date.parse(latestDate);

      const lagging = rows
        .filter((r) => r.date !== latestDate)
        .map((r) => ({
          chain: r.chain,
          date: r.date,
          daysBehind: Math.round((latestMs - Date.parse(r.date)) / MS_PER_DAY),
        }));
      lagging.sort((a, b) => b.daysBehind - a.daysBehind);

      return lagging;
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
