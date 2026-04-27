import { useMemo } from "react";
import {
  mapProjectToName,
  TOKEN_ICON_MAP,
  CHAIN_NAME_TO_ID,
  type DefiLlamaPool,
  type LiquidityPool,
} from "@/modules/ohm/utils/defi-llama.ts";
import { useDefiLlamaPools } from "@/modules/ohm/hooks/useDefiLlamaPools.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const STABLECOIN_SYMBOLS = new Set([
  "USDC",
  "USDT",
  "DAI",
  "FRAX",
  "USDS",
  "SUSD",
  "SUSDS",
  "LUSD",
  "CRVUSD",
  "GHO",
]);

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function getCategory(parts: string[], stablecoin: boolean): LiquidityPool["category"] {
  if (parts.some((p) => p === "GOHM")) return "gohm";
  if (stablecoin || parts.some((p) => STABLECOIN_SYMBOLS.has(p))) return "stable";
  return "volatile";
}

function mapPool(pool: DefiLlamaPool): LiquidityPool {
  const rawParts = pool.symbol.toUpperCase().split("-");
  const [rawA, ...rest] = rawParts;
  const symbolA = rawA;
  const symbolB = rest.join("-") || rawA;

  return {
    id: pool.pool,
    tokenA: { symbol: symbolA, iconName: TOKEN_ICON_MAP[symbolA] ?? null },
    tokenB: { symbol: symbolB, iconName: TOKEN_ICON_MAP[symbolB] ?? null },
    chainId: CHAIN_NAME_TO_ID[pool.chain] ?? 1,
    tvl: pool.tvlUsd,
    apy: (pool.apy ?? 0) / 100,
    project: mapProjectToName(pool.project),
    depositUrl: `https://defillama.com/yields/pool/${pool.pool}`,
    category: getCategory(rawParts, pool.stablecoin),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOhmLiquidityPools() {
  const { data: pools, isLoading, error } = useDefiLlamaPools();

  const data = useMemo(() => pools?.map(mapPool) ?? [], [pools]);

  return { data, isLoading, error };
}
