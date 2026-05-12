import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants";

export interface LpPosition {
  name: string;
  blockchain: string;
  value: number;
  valueExcludingOhm: number;
}

export interface ReserveHolding {
  token: string;
  blockchain: string;
  category: string;
  balance: number;
  value: number;
  isLiquid: boolean;
  backingContribution: number;
}

interface ReserveBalances {
  susdeValue: number;
  susdsValue: number;
  lpPositions: LpPosition[];
  holdings: ReserveHolding[];
}

// 30 days — cross-chain indexer lag can leave a pool stale for >1 week
// (e.g. Arbitrum), so a yesterday-only window drops live positions.
const LOOKBACK_DAYS = 30;

function isLpToken(token: string): boolean {
  const lower = token.toLowerCase();
  return lower.includes("liquidity pool") || lower.includes(" lp");
}

function isNewer(date: string, latest?: string): boolean {
  return !latest || date > latest;
}

function getDisplayTokenName(token: string): string {
  if (token === "USDS - Borrowed Through Cooler Loans V2") return "Cooler Loan USDS Receivables";
  if (token === "DAI - Borrowed Through Cooler Loans") return "Cooler Loan DAI Receivables";
  return token;
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
        isLiquid: boolean;
        date: string;
        category: string;
        id: string;
        sourceAddress: string;
      }> = json.data ?? [];

      // Use the latest available snapshot per chain before aggregating.
      // A pure "latest per wallet/token across 30 days" window can preserve positions that
      // disappeared from newer snapshots, e.g. redeemed receipt tokens.
      const latestDateByChain = new Map<string, string>();
      for (const rec of records) {
        const chain = rec.blockchain || "Unknown";
        if (isNewer(rec.date, latestDateByChain.get(chain))) {
          latestDateByChain.set(chain, rec.date);
        }
      }

      const latestSnapshotRecords = records.filter(
        (rec) => rec.date === latestDateByChain.get(rec.blockchain || "Unknown"),
      );

      const holdingAgg = new Map<string, ReserveHolding>();
      const lpAgg = new Map<string, LpPosition>();

      for (const rec of latestSnapshotRecords) {
        const value = parseFloat(rec.value) || 0;
        const balance = parseFloat(rec.balance) || 0;
        const valueExcludingOhm = parseFloat(rec.valueExcludingOhm) || 0;
        const backingContribution = rec.isLiquid ? valueExcludingOhm : 0;
        const token = getDisplayTokenName(rec.token);
        const holdingKey = `${token}|${rec.blockchain}|${rec.category}`;
        const existingHolding = holdingAgg.get(holdingKey);

        if (existingHolding) {
          existingHolding.balance += balance;
          existingHolding.value += value;
          existingHolding.isLiquid ||= rec.isLiquid;
          existingHolding.backingContribution += backingContribution;
        } else {
          holdingAgg.set(holdingKey, {
            token,
            blockchain: rec.blockchain,
            category: rec.category,
            balance,
            value,
            isLiquid: rec.isLiquid,
            backingContribution,
          });
        }

        if (isLpToken(rec.token) && rec.category === "Protocol-Owned Liquidity") {
          const lpKey = `${rec.token}|${rec.blockchain}`;
          const existingLp = lpAgg.get(lpKey);

          if (existingLp) {
            existingLp.value += value;
            existingLp.valueExcludingOhm += valueExcludingOhm;
          } else {
            lpAgg.set(lpKey, {
              name: rec.token,
              blockchain: rec.blockchain,
              value,
              valueExcludingOhm,
            });
          }
        }
      }

      const holdings = Array.from(holdingAgg.values()).filter((h) => h.value > 1);
      let susdeValue = 0;
      let susdsValue = 0;
      for (const h of holdings) {
        const name = h.token.toLowerCase();
        if (name === "staked usde") susdeValue += h.value;
        else if (name === "savings usds") susdsValue += h.value;
      }
      const lpPositions = Array.from(lpAgg.values()).filter((p) => p.value > 1000);

      return { susdeValue, susdsValue, lpPositions, holdings };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
