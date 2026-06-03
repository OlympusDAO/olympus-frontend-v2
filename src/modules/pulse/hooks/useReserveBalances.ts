import { useQuery } from "@tanstack/react-query";
import { treasuryClient } from "@/lib/treasury-api";
import type { TreasuryAsset } from "@/lib/treasury-api";

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

function getDisplayTokenName(token: string): string {
  if (token.startsWith("USDS - Borrowed Through Cooler Loans"))
    return "Cooler Loan USDS Receivables";
  if (token.startsWith("DAI - Borrowed Through Cooler Loans")) return "Cooler Loan DAI Receivables";
  return token;
}

// The publisher emits ~3 daily snapshots per chain (8h cadence). Summing all
// rows in the window over-counts; keep only the freshest (date, block) per
// chain.
function filterLatestSnapshotPerChain(records: TreasuryAsset[]): TreasuryAsset[] {
  const keyByChain = new Map<string, { date: string; block: number }>();
  for (const r of records) {
    const chain = r.blockchain || "Unknown";
    const cur = keyByChain.get(chain);
    if (!cur || r.date > cur.date || (r.date === cur.date && r.block > cur.block)) {
      keyByChain.set(chain, { date: r.date, block: r.block });
    }
  }
  return records.filter((r) => {
    const key = keyByChain.get(r.blockchain || "Unknown");
    return !!key && r.date === key.date && r.block === key.block;
  });
}

export function useReserveBalances() {
  return useQuery<ReserveBalances>({
    queryKey: ["reserveBalances", "pulse", "treasury-api"],
    queryFn: async ({ signal }) => {
      const start = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().split("T")[0];

      const raw = await treasuryClient.getDailyTreasuryAssets({
        start,
        autoPaginate: true,
        signal,
      });
      const latestSnapshotRecords = filterLatestSnapshotPerChain(raw);

      const holdingAgg = new Map<string, ReserveHolding>();
      const lpAgg = new Map<string, LpPosition>();

      for (const rec of latestSnapshotRecords) {
        const value = rec.value;
        const balance = rec.balance;
        const valueExcludingOhm = rec.valueExcludingOhm;
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

        if (rec.category === "Protocol-Owned Liquidity") {
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
        if (name === "staked usde (susde)") susdeValue += h.value;
        else if (name === "savings usds (susds)") susdsValue += h.value;
      }
      const lpPositions = Array.from(lpAgg.values())
        .filter((p) => p.value > 1000)
        .sort((a, b) => b.value - a.value);

      return { susdeValue, susdsValue, lpPositions, holdings };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
