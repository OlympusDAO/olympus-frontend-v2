import { useQuery } from "@tanstack/react-query";
import { DEFILLAMA_YIELDS_URL } from "@/lib/constants.ts";
import { mapProjectToName } from "@/modules/ohm/utils/defi-llama.ts";
import { mainnet, arbitrum, polygon, optimism, avalanche, fantom, base } from "@/lib/chains.ts";
import type { IconName } from "@/components/icon.tsx";
import type { LiquidityPool } from "@/modules/ohm/components/utility-liquidity-pools-table.tsx";

// ─── DefiLlama API types ──────────────────────────────────────────────────────

interface DefiLlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  stablecoin: boolean;
}

interface PoolsResponse {
  data: DefiLlamaPool[];
}

// ─── Lookup tables ────────────────────────────────────────────────────────────

const TOKEN_ICON_MAP: Partial<Record<string, IconName>> = {
  OHM: "OHMColorTokenIcon",
  GOHM: "GOHMColorTokenIcon",
  USDS: "USDSColorTokenIcon",
};

const CHAIN_NAME_TO_ID: Record<string, number> = {
  Ethereum: mainnet.id,
  Arbitrum: arbitrum.id,
  Polygon: polygon.id,
  Optimism: optimism.id,
  Avalanche: avalanche.id,
  Fantom: fantom.id,
  Base: base.id,
  BSC: 56,
};

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
  // DefiLlama symbols look like "OHM-USDC" or "OHM-FRAXBP" or "OHMFRAXBP"
  const rawParts = pool.symbol.toUpperCase().split("-");
  const [rawA, ...rest] = rawParts;
  const symbolA = rawA;
  const symbolB = rest.join("-") || rawA; // fallback to same if single-token

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

// ─── Fetch function ───────────────────────────────────────────────────────────

async function fetchOhmPools(): Promise<LiquidityPool[]> {
  const res = await fetch(`${DEFILLAMA_YIELDS_URL}/pools`);
  if (!res.ok) throw new Error(`DefiLlama /pools failed: ${res.status}`);
  const json: PoolsResponse = await res.json();

  return json.data
    .filter((pool) => {
      const parts = pool.symbol.toUpperCase().split("-");
      return parts.includes("OHM") || parts.includes("GOHM") || parts[0] === "OHMFRAXBP";
    })
    .map(mapPool);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOhmLiquidityPools() {
  return useQuery<LiquidityPool[]>({
    queryKey: ["ohmLiquidityPools"],
    queryFn: fetchOhmPools,
    staleTime: 5 * 60_000,
  });
}
