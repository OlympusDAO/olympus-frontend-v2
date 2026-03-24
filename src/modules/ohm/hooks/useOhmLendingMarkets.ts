import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DEFILLAMA_YIELDS_URL } from "@/lib/constants.ts";
import {
  mapProjectToName,
  TOKEN_ICON_MAP,
  CHAIN_NAME_TO_ID,
  type DefiLlamaPool,
  type LendingMarket,
} from "@/modules/ohm/utils/defi-llama.ts";
import { useDefiLlamaPools } from "@/modules/ohm/hooks/useDefiLlamaPools.ts";

// ─── DefiLlama lendBorrow types ───────────────────────────────────────────────

interface LendBorrowPool {
  pool: string;
  apyBaseBorrow: number;
  totalSupplyUsd: number;
  totalBorrowUsd: number;
  mintedCoin: string | null;
}

// ─── Mapping helper ───────────────────────────────────────────────────────────

function mapLendingMarket(pool: DefiLlamaPool, lend: LendBorrowPool): LendingMarket {
  const lendSymbol = pool.symbol.toUpperCase();
  const borrowSymbol = lend.mintedCoin ? lend.mintedCoin.toUpperCase() : lendSymbol;

  return {
    id: pool.pool,
    lend: { symbol: lendSymbol, iconName: TOKEN_ICON_MAP[lendSymbol] ?? null },
    borrow: { symbol: borrowSymbol, iconName: TOKEN_ICON_MAP[borrowSymbol] ?? null },
    chainId: CHAIN_NAME_TO_ID[pool.chain] ?? 1,
    tvl: pool.tvlUsd,
    supplyApy: (pool.apy ?? 0) / 100,
    borrowApy: (lend.apyBaseBorrow ?? 0) / 100,
    available: Math.max(0, (lend.totalSupplyUsd ?? 0) - (lend.totalBorrowUsd ?? 0)),
    token: lendSymbol.includes("GOHM") ? "gohm" : "ohm",
    project: mapProjectToName(pool.project),
    depositUrl: `https://defillama.com/yields/pool/${pool.pool}`,
  };
}

// ─── lendBorrow fetch ─────────────────────────────────────────────────────────

async function fetchLendBorrowData(): Promise<Map<string, LendBorrowPool>> {
  const res = await fetch(`${DEFILLAMA_YIELDS_URL}/lendBorrow`);
  if (!res.ok) throw new Error(`DefiLlama /lendBorrow failed: ${res.status}`);
  const data: LendBorrowPool[] = await res.json();
  return new Map(data.map((lb) => [lb.pool, lb]));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOhmLendingMarkets() {
  const { data: pools } = useDefiLlamaPools();
  const { data: lendMap, isLoading: isLendLoading } = useQuery({
    queryKey: ["defiLlamaLendBorrow"],
    queryFn: fetchLendBorrowData,
    staleTime: 5 * 60_000,
  });

  const data = useMemo(() => {
    if (!pools || !lendMap) return [];
    return pools
      .filter((pool) => lendMap.has(pool.pool))
      .map((pool) => {
        const lend = lendMap.get(pool.pool);
        if (!lend) return null;
        return mapLendingMarket(pool, lend);
      })
      .filter((m): m is LendingMarket => m !== null);
  }, [pools, lendMap]);

  const isLoading = !pools || isLendLoading;

  return { data, isLoading };
}
