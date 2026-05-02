import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants";

export const LP_FEES_WINDOW_DAYS = 7;

export interface LpFeesEarnedPool {
  name: string;
  blockchain: string;
  feesEarnedUsd: number;
  collectedFeesUsd: number;
  uncollectedFeesDeltaUsd: number;
  tokenFees: Array<{
    symbol: string;
    amount: number;
    valueUsd: number;
  }>;
  source: "position-fee-accounting";
  asOf: string;
}

export interface LpFeesEarned {
  windowDays: number;
  totalFeesEarnedUsd: number;
  pools: LpFeesEarnedPool[];
}

interface RawLpFeesEarnedPool {
  name?: string;
  token?: string;
  blockchain?: string;
  chain?: string;
  feesEarnedUsd?: string | number;
  feesEarned?: string | number;
  collectedFeesUsd?: string | number;
  collectedUsd?: string | number;
  uncollectedFeesDeltaUsd?: string | number;
  uncollectedDeltaUsd?: string | number;
  tokenFees?: Array<{
    symbol?: string;
    amount?: string | number;
    valueUsd?: string | number;
  }>;
  source?: string;
  asOf?: string;
}

function numberFrom(value: string | number | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePool(pool: RawLpFeesEarnedPool): LpFeesEarnedPool | undefined {
  const name = pool.name ?? pool.token;
  const blockchain = pool.blockchain ?? pool.chain;
  if (!name || !blockchain) return undefined;

  const feesEarnedUsd = numberFrom(pool.feesEarnedUsd ?? pool.feesEarned);
  const collectedFeesUsd = numberFrom(pool.collectedFeesUsd ?? pool.collectedUsd);
  const uncollectedFeesDeltaUsd = numberFrom(
    pool.uncollectedFeesDeltaUsd ?? pool.uncollectedDeltaUsd,
  );

  return {
    name,
    blockchain,
    feesEarnedUsd,
    collectedFeesUsd,
    uncollectedFeesDeltaUsd,
    tokenFees: (pool.tokenFees ?? []).map((fee) => ({
      symbol: fee.symbol ?? "",
      amount: numberFrom(fee.amount),
      valueUsd: numberFrom(fee.valueUsd),
    })),
    source: "position-fee-accounting",
    asOf: pool.asOf ?? new Date().toISOString(),
  };
}

export function useLpFeesEarned() {
  return useQuery<LpFeesEarned>({
    queryKey: ["lpFeesEarned", LP_FEES_WINDOW_DAYS],
    queryFn: async () => {
      const params = JSON.stringify({
        windowDays: LP_FEES_WINDOW_DAYS,
        method: "position_fee_accounting",
      });
      const response = await fetch(
        `${TREASURY_API_URL}/operations/lpFeesEarned?wg_variables=${encodeURIComponent(params)}`,
      );

      if (!response.ok) throw new Error("Failed to fetch position-level LP fees earned");

      const json = await response.json();
      const rawPools: RawLpFeesEarnedPool[] = json.data?.pools ?? json.pools ?? [];
      const pools = rawPools
        .map(normalizePool)
        .filter((pool): pool is LpFeesEarnedPool => Boolean(pool));
      const totalFeesEarnedUsd =
        numberFrom(json.data?.totalFeesEarnedUsd ?? json.totalFeesEarnedUsd) ||
        pools.reduce((sum, pool) => sum + pool.feesEarnedUsd, 0);

      return {
        windowDays: numberFrom(json.data?.windowDays ?? json.windowDays) || LP_FEES_WINDOW_DAYS,
        totalFeesEarnedUsd,
        pools,
      };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
    retry: false,
  });
}
