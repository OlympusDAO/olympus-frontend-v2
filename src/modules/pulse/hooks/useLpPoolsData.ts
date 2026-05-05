import { useQuery } from "@tanstack/react-query";
import {
  DEFILLAMA_YIELDS_URL,
  KODIAK_API_URL,
  KODIAK_VAULT_MAP,
  LP_POOL_MAP,
} from "@/lib/constants";
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

type DefiLlamaChartPoint = {
  apyBase: number | null;
  apyBase7d?: number | null;
};

type KodiakVault = {
  id: string;
  apr: number | null;
};

function getFeeApy(point: DefiLlamaChartPoint | undefined): number {
  return point?.apyBase7d ?? point?.apyBase ?? 0;
}

// Fetches fee APY for every pool in LP_POOL_MAP via DefiLlama's per-pool chart endpoint.
// The Pulse table displays "7d Fees", so prefer apyBase7d when available and fall back
// to the latest apyBase only when DefiLlama has not calculated a 7d value.
async function fetchFeeApyByPoolId(poolIds: string[]): Promise<Map<string, number>> {
  const results = await Promise.all(
    poolIds.map(async (id) => {
      try {
        const res = await fetch(`${DEFILLAMA_YIELDS_URL}/chart/${id}`);
        if (!res.ok) return [id, 0] as const;
        const json = await res.json();
        const points: DefiLlamaChartPoint[] = json?.data ?? [];
        const latest = points[points.length - 1];
        return [id, getFeeApy(latest)] as const;
      } catch {
        return [id, 0] as const;
      }
    }),
  );
  return new Map(results);
}

// Kodiak Island fee APR is not currently populated in DefiLlama's OHM-HONEY pool.
// Use Kodiak's own vault endpoint for Berachain POL rows so the 7d Fees column does
// not silently zero out when the vault has fee APR data.
async function fetchKodiakFeeApyByVaultId(vaultIds: string[]): Promise<Map<string, number>> {
  if (vaultIds.length === 0) return new Map();

  try {
    const res = await fetch(`${KODIAK_API_URL}/vaults`);
    if (!res.ok) return new Map();

    const wantedVaultIds = new Set(vaultIds.map((id) => id.toLowerCase()));
    const vaults: KodiakVault[] = (await res.json())?.data ?? [];

    return new Map(
      vaults
        .filter((vault) => wantedVaultIds.has(vault.id.toLowerCase()))
        .map((vault) => [vault.id.toLowerCase(), vault.apr ?? 0] as const),
    );
  } catch {
    return new Map();
  }
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
      const kodiakVaultIds = lpPositions
        .map((p) => KODIAK_VAULT_MAP[p.name])
        .filter((id): id is string => Boolean(id));
      const [feeApyByPoolId, feeApyByKodiakVaultId] = await Promise.all([
        fetchFeeApyByPoolId(poolIds),
        fetchKodiakFeeApyByVaultId(kodiakVaultIds),
      ]);

      return lpPositions.map((pos) => {
        const chainId = CHAIN_NAME_TO_ID[pos.blockchain] ?? 0;
        const llamaPoolId = LP_POOL_MAP[pos.name];
        const kodiakVaultId = KODIAK_VAULT_MAP[pos.name]?.toLowerCase();
        const apyBase =
          (llamaPoolId ? feeApyByPoolId.get(llamaPoolId) : undefined) ??
          (kodiakVaultId ? feeApyByKodiakVaultId.get(kodiakVaultId) : undefined) ??
          0;
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
