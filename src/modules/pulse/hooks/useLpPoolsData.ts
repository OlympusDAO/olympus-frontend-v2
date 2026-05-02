import { useMemo } from "react";
import { CHAIN_NAME_TO_ID } from "@/modules/ohm/utils/defi-llama";
import { useLpFeesEarned } from "@/modules/pulse/hooks/useLpFeesEarned";
import { useReserveBalances } from "@/modules/pulse/hooks/useReserveBalances";

export interface LpPoolRow {
  name: string;
  protocol: string;
  chain: string;
  chainId: number;
  tvl: number;
  weeklyFees: number | null;
  collectedFeesUsd: number | null;
  uncollectedFeesDeltaUsd: number | null;
  ohmPct: number;
  ohmDepth: number;
}

// "Uniswap V3 OHM-sUSDS Liquidity Pool" → "Uniswap V3"
// "Beradrome Kodiak OHM-HONEY LP" → "Beradrome Kodiak"
// "Camelot OHM-wETH Liquidity Pool" → "Camelot"
function parseProtocolFromToken(token: string): string {
  const match = token.match(/^(.+?)\s+[A-Za-z0-9]+-[A-Za-z0-9]+\s+(LP|Liquidity Pool)$/i);
  return match ? match[1].trim() : token;
}

function poolKey(name: string, blockchain: string): string {
  return `${name.toLowerCase()}|${blockchain.toLowerCase()}`;
}

export function useLpPoolsData() {
  const { data: reserves, isLoading: reservesLoading } = useReserveBalances();
  const { data: fees, isLoading: feesLoading } = useLpFeesEarned();

  const rows = useMemo<LpPoolRow[]>(() => {
    const feesByPool = new Map(
      (fees?.pools ?? []).map((pool) => [poolKey(pool.name, pool.blockchain), pool]),
    );

    return (reserves?.lpPositions ?? []).map((pos) => {
      const chainId = CHAIN_NAME_TO_ID[pos.blockchain] ?? 0;
      const feeData = feesByPool.get(poolKey(pos.name, pos.blockchain));
      const ohmDepth = Math.max(pos.value - pos.valueExcludingOhm, 0);
      const ohmPct = pos.value > 0 ? ohmDepth / pos.value : 0;

      return {
        name: pos.name,
        protocol: parseProtocolFromToken(pos.name),
        chain: pos.blockchain,
        chainId,
        tvl: pos.value,
        weeklyFees: feeData?.feesEarnedUsd ?? null,
        collectedFeesUsd: feeData?.collectedFeesUsd ?? null,
        uncollectedFeesDeltaUsd: feeData?.uncollectedFeesDeltaUsd ?? null,
        ohmPct,
        ohmDepth,
      };
    });
  }, [reserves, fees]);

  return {
    data: rows,
    isLoading: reservesLoading || feesLoading,
  };
}
