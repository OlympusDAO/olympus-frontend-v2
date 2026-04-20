import { mainnet, arbitrum, polygon, optimism, avalanche, fantom, base } from "@/lib/chains.ts";
import type { IconName } from "@/components/icon.tsx";

// ─── DefiLlama API types ──────────────────────────────────────────────────────

export interface DefiLlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  stablecoin: boolean;
}

export interface PoolsResponse {
  data: DefiLlamaPool[];
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export type LendingMarket = {
  id: string;
  lend: { symbol: string; iconName: IconName | null };
  borrow: { symbol: string; iconName: IconName | null };
  chainId: number;
  tvl: number;
  supplyApy: number;
  borrowApy: number;
  available: number;
  project: string;
  depositUrl: string;
  token: "ohm" | "gohm";
};

export type LiquidityPool = {
  id: string;
  tokenA: { symbol: string; iconName: IconName | null };
  tokenB: { symbol: string; iconName: IconName | null };
  chainId: number;
  tvl: number;
  apy: number;
  project: string;
  depositUrl: string;
  category: "stable" | "volatile" | "gohm";
};

// ─── Lookup tables ────────────────────────────────────────────────────────────

export const TOKEN_ICON_MAP: Partial<Record<string, IconName>> = {
  OHM: "OHMTokenIcon",
  GOHM: "GOHMTokenIcon",
  USDS: "USDSColorTokenIcon",
};

export const CHAIN_NAME_TO_ID: Record<string, number> = {
  Ethereum: mainnet.id,
  Arbitrum: arbitrum.id,
  Polygon: polygon.id,
  Optimism: optimism.id,
  Avalanche: avalanche.id,
  Fantom: fantom.id,
  Base: base.id,
  BSC: 56,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps a DefiLlama project slug to a human-readable name. */
export function mapProjectToName(project: string): string {
  const overrides: Record<string, string> = {
    "uniswap-v3": "Uniswap V3",
    "uniswap-v2": "Uniswap V2",
    "curve-dex": "Curve",
    curve: "Curve",
    "balancer-v2": "Balancer V2",
    balancer: "Balancer",
    "aave-v3": "Aave V3",
    "aave-v2": "Aave V2",
    aave: "Aave",
    "compound-v3": "Compound V3",
    "compound-v2": "Compound V2",
    compound: "Compound",
    dolomite: "Dolomite",
    frax: "Frax",
    fraxlend: "FraxLend",
    "camelot-v3": "Camelot V3",
    "camelot-v2": "Camelot V2",
    camelot: "Camelot",
    sushiswap: "SushiSwap",
    euler: "Euler",
    "morpho-blue": "Morpho Blue",
    morpho: "Morpho",
    spark: "Spark",
  };

  return (
    overrides[project.toLowerCase()] ??
    project
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}
