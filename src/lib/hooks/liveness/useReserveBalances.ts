import { useQuery } from "@tanstack/react-query";
import {
  fetchTokenRecords,
  filterLatestSnapshotPerChain,
  parseEnvioNumber,
} from "@/lib/utils/envio";

export interface LpPosition {
  name: string;
  value: number;
}

interface ReserveBalances {
  susdeValue: number;
  susdsValue: number;
  lpPositions: LpPosition[];
}

export function useReserveBalances() {
  return useQuery<ReserveBalances>({
    queryKey: ["reserveBalances", "envio"],
    queryFn: async ({ signal }) => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
      const raw = await fetchTokenRecords({ date: { _gte: yesterday } }, signal);
      const records = filterLatestSnapshotPerChain(raw);

      let susdeValue = 0;
      let susdsValue = 0;
      const lpMap = new Map<string, number>();

      for (const rec of records) {
        const tokenLower = (rec.token || "").toLowerCase();
        const value = parseEnvioNumber(rec.value);

        if (tokenLower === "staked usde (susde)") susdeValue += value;
        else if (tokenLower === "savings usds (susds)") susdsValue += value;

        if (rec.category === "Protocol-Owned Liquidity") {
          lpMap.set(rec.token, (lpMap.get(rec.token) ?? 0) + value);
        }
      }

      const lpPositions: LpPosition[] = [];
      for (const [name, value] of lpMap) {
        if (value > 1000) lpPositions.push({ name, value });
      }

      return { susdeValue, susdsValue, lpPositions };
    },
    staleTime: 300_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
