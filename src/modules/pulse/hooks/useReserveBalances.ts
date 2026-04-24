import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants";

export interface LpPosition {
  name: string;
  blockchain: string;
  value: number;
  valueExcludingOhm: number;
}

interface ReserveBalances {
  susdeValue: number;
  susdsValue: number;
  lpPositions: LpPosition[];
}

// 30 days — cross-chain indexer lag can leave a pool stale for >1 week
// (e.g. Arbitrum), so a yesterday-only window drops live positions.
const LOOKBACK_DAYS = 30;

function isLpToken(token: string): boolean {
  const lower = token.toLowerCase();
  return lower.includes("liquidity pool") || lower.includes(" lp");
}

export function useReserveBalances() {
  return useQuery<ReserveBalances>({
    queryKey: ["reserveBalances"],
    queryFn: async () => {
      const startDate = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000)
        .toISOString()
        .split("T")[0];
      const params = JSON.stringify({
        startDate,
        crossChainDataComplete: false,
        ignoreCache: false,
      });

      const response = await fetch(
        `${TREASURY_API_URL}/operations/paginated/tokenRecords?wg_variables=${encodeURIComponent(params)}`,
      );

      if (!response.ok) throw new Error("Failed to fetch reserve balances");

      const json = await response.json();
      const records: Array<{
        token: string;
        blockchain: string;
        balance: string;
        value: string;
        valueExcludingOhm: string;
        date: string;
        category: string;
      }> = json.data ?? [];

      let susdeValue = 0;
      let susdsValue = 0;
      // Keep the latest record per (token, blockchain) — summing across source wallets on that date.
      const lpLatestDate = new Map<string, string>();
      const lpAgg = new Map<string, LpPosition>();

      for (const rec of records) {
        const tokenLower = (rec.token || "").toLowerCase();
        const value = parseFloat(rec.value) || 0;

        if (tokenLower === "staked usde" && value > susdeValue) {
          susdeValue = value;
        }
        if (tokenLower === "savings usds" && value > susdsValue) {
          susdsValue = value;
        }

        if (isLpToken(rec.token) && rec.category === "Protocol-Owned Liquidity") {
          const key = `${rec.token}|${rec.blockchain}`;
          const latest = lpLatestDate.get(key);
          if (!latest || rec.date > latest) {
            // New latest date — reset aggregation
            lpLatestDate.set(key, rec.date);
            lpAgg.set(key, {
              name: rec.token,
              blockchain: rec.blockchain,
              value,
              valueExcludingOhm: parseFloat(rec.valueExcludingOhm) || 0,
            });
          } else if (rec.date === latest) {
            // Same date, different source wallet — sum
            const existing = lpAgg.get(key);
            if (existing) {
              existing.value += value;
              existing.valueExcludingOhm += parseFloat(rec.valueExcludingOhm) || 0;
            }
          }
        }
      }

      const lpPositions = Array.from(lpAgg.values()).filter((p) => p.value > 1000);

      return { susdeValue, susdsValue, lpPositions };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
