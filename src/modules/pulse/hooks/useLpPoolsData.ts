import { useQuery } from "@tanstack/react-query";
import { DEFILLAMA_YIELDS_URL, LP_POOL_MAP } from "@/lib/constants";
import { CHAIN_NAME_TO_ID } from "@/modules/ohm/utils/defi-llama";
import { useReserveBalances } from "@/modules/pulse/hooks/useReserveBalances";

export interface LpPoolRow {
  name: string;
  protocol: string;
  chain: string;
  chainId: number;
  tvl: number;
  apyBase: number;
  weeklyFees: number;
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

// Fetches apyBase for every pool in LP_POOL_MAP via DefiLlama's per-pool chart endpoint.
// We hit the single-pool endpoint (rather than the full /pools list) to minimize payload.
async function fetchApyBaseByPoolId(poolIds: string[]): Promise<Map<string, number>> {
  const results = await Promise.all(
    poolIds.map(async (id) => {
      try {
        const res = await fetch(`${DEFILLAMA_YIELDS_URL}/chart/${id}`);
        if (!res.ok) return [id, 0] as const;
        const json = await res.json();
        const points: Array<{ apyBase: number | null }> = json?.data ?? [];
        const latest = points[points.length - 1];
        return [id, latest?.apyBase ?? 0] as const;
      } catch {
        return [id, 0] as const;
      }
    }),
  );
  return new Map(results);
}

export function useLpPoolsData() {
  const { data: reserves } = useReserveBalances();

  return useQuery<LpPoolRow[]>({
    queryKey: ["lpPoolsData", reserves?.lpPositions?.map((p) => p.name).join(",")],
    enabled: (reserves?.lpPositions?.length ?? 0) > 0,
    queryFn: async () => {
      const lpPositions = reserves?.lpPositions ?? [];
      const poolIds = lpPositions
        .map((p) => LP_POOL_MAP[p.name])
        .filter((id): id is string => Boolean(id));
      const apyByPoolId = await fetchApyBaseByPoolId(poolIds);

      return lpPositions.map((pos) => {
        const chainId = CHAIN_NAME_TO_ID[pos.blockchain] ?? 0;
        const apyBase = apyByPoolId.get(LP_POOL_MAP[pos.name]) ?? 0;
        const weeklyFees = (pos.value * (apyBase / 100)) / 52;
        const ohmDepth = Math.max(pos.value - pos.valueExcludingOhm, 0);
        const ohmPct = pos.value > 0 ? ohmDepth / pos.value : 0;

        return {
          name: pos.name,
          protocol: parseProtocolFromToken(pos.name),
          chain: pos.blockchain,
          chainId,
          tvl: pos.value,
          apyBase,
          weeklyFees,
          ohmPct,
          ohmDepth,
        };
      });
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
