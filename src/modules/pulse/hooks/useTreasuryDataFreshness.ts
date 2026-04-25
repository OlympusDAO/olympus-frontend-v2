import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants.ts";

export interface LaggingChain {
  chain: string;
  date: string;
  daysBehind: number;
}

const MS_PER_DAY = 86_400_000;

export function useTreasuryDataFreshness() {
  return useQuery<LaggingChain[]>({
    queryKey: ["treasuryDataFreshness"],
    queryFn: async () => {
      const params = encodeURIComponent(JSON.stringify({ ignoreCache: false }));
      const response = await fetch(
        `${TREASURY_API_URL}/operations/latest/tokenRecords?wg_variables=${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch treasury data freshness");

      const json = await response.json();
      const records: Array<{ blockchain: string; date: string }> = json.data ?? [];

      const latestByChain = new Map<string, string>();
      for (const r of records) {
        const prev = latestByChain.get(r.blockchain);
        if (!prev || r.date > prev) latestByChain.set(r.blockchain, r.date);
      }

      let latestDate = "";
      for (const date of latestByChain.values()) {
        if (date > latestDate) latestDate = date;
      }

      const latestMs = latestDate ? Date.parse(latestDate) : 0;
      const lagging: LaggingChain[] = [];
      for (const [chain, date] of latestByChain) {
        if (date === latestDate) continue;
        const daysBehind = Math.round((latestMs - Date.parse(date)) / MS_PER_DAY);
        lagging.push({ chain, date, daysBehind });
      }
      lagging.sort((a, b) => b.daysBehind - a.daysBehind);

      return lagging;
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
