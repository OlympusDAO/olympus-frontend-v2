import { useQuery } from "@tanstack/react-query";
import { DEFILLAMA_YIELDS_URL } from "@/lib/constants.ts";
import { mapProjectToName } from "@/modules/ohm/utils/defi-llama.ts";
import { mainnet, arbitrum, polygon, optimism, avalanche, fantom, base } from "@/lib/chains.ts";
import type { IconName } from "@/components/icon.tsx";
import type { LendingMarket } from "@/modules/ohm/components/utility-lending-markets-table.tsx";

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

interface LendBorrowPool {
  pool: string;
  apyBaseBorrow: number;
  totalSupplyUsd: number;
  totalBorrowUsd: number;
  mintedCoin: string | null;
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

// ─── Fetch function ───────────────────────────────────────────────────────────

async function fetchOhmLendingMarkets(): Promise<LendingMarket[]> {
  const [poolsRes, lendRes] = await Promise.all([
    fetch(`${DEFILLAMA_YIELDS_URL}/pools`),
    fetch(`${DEFILLAMA_YIELDS_URL}/lendBorrow`),
  ]);

  if (!poolsRes.ok) throw new Error(`DefiLlama /pools failed: ${poolsRes.status}`);
  if (!lendRes.ok) throw new Error(`DefiLlama /lendBorrow failed: ${lendRes.status}`);

  const [poolsJson, lendJson]: [PoolsResponse, LendBorrowPool[]] = await Promise.all([
    poolsRes.json(),
    lendRes.json(),
  ]);

  const lendMap = new Map(lendJson.map((lb) => [lb.pool, lb]));

  return poolsJson.data
    .filter((pool) => {
      const parts = pool.symbol.toUpperCase().split("-");
      return parts.includes("OHM") || parts.includes("GOHM");
    })
    .filter((pool) => lendMap.has(pool.pool))
    .map((pool) => {
      const lend = lendMap.get(pool.pool);
      if (!lend) return null;
      return mapLendingMarket(pool, lend);
    })
    .filter((m): m is LendingMarket => m !== null);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOhmLendingMarkets() {
  return useQuery<LendingMarket[]>({
    queryKey: ["ohmLendingMarkets"],
    queryFn: fetchOhmLendingMarkets,
    staleTime: 5 * 60_000,
  });
}
