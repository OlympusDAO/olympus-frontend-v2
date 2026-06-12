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
  displayName: string;
  protocol: string;
  chain: string;
  chainId: number;
  tvl: number;
  apyBase: number | null;
  weeklyFees: number | null;
  ohmPct: number;
  ohmDepth: number;
}

// "UniswapV3 WETH-OHM" → "Uniswap V3"
// "Camelot OHM-wETH Liquidity Pool" → "Camelot"
// "Beradrome Kodiak OHM-HONEY LP" → "Beradrome Kodiak"
// Envio dropped the "LP"/"Liquidity Pool" suffix on some UniV3 pools and
// collapsed "Uniswap V3" → "UniswapV3"; restore the canonical spacing.
function parseProtocolFromToken(token: string): string {
  const withoutSuffix = token.replace(/\s+(LP|Liquidity Pool)$/i, "").trim();
  const withoutPair = withoutSuffix.replace(/\s+[A-Za-z0-9]+-[A-Za-z0-9]+$/, "").trim();
  const protocol = withoutPair || token;
  return protocol.replace(/^UniswapV(\d)/i, "Uniswap V$1");
}

type DefiLlamaChartPoint = {
  apyBase: number | null;
  apyBase7d?: number | null;
};

type KodiakVault = {
  id: string;
  apr: number | null;
};

function getFeeApy(point: DefiLlamaChartPoint | undefined): number | null {
  return point?.apyBase7d ?? point?.apyBase ?? null;
}

// Fetches fee APY for every pool in LP_POOL_MAP via DefiLlama's per-pool chart endpoint.
// The table reports an estimated weekly run-rate, not observed fees collected by Olympus:
// prefer DefiLlama's 7d fee APY when available and fall back to latest fee APY.
async function fetchFeeApyByPoolId(poolIds: string[]): Promise<Map<string, number | null>> {
  const results = await Promise.all(
    poolIds.map(async (id) => {
      try {
        const res = await fetch(`${DEFILLAMA_YIELDS_URL}/chart/${id}`);
        if (!res.ok) return [id, null] as const;
        const json = await res.json();
        const points: DefiLlamaChartPoint[] = json?.data ?? [];
        const latest = points[points.length - 1];
        return [id, getFeeApy(latest)] as const;
      } catch {
        return [id, null] as const;
      }
    }),
  );
  return new Map(results);
}

// Kodiak Island fee APR is not currently populated in DefiLlama's OHM-HONEY pool.
// Use Kodiak's own vault endpoint for Berachain POL rows so the 7d Fees column does
// not silently zero out when the vault has fee APR data.
async function fetchKodiakFeeApyByVaultId(vaultIds: string[]): Promise<Map<string, number | null>> {
  if (vaultIds.length === 0) return new Map();

  try {
    const res = await fetch(`${KODIAK_API_URL}/vaults`);
    if (!res.ok) return new Map();

    const wantedVaultIds = new Set(vaultIds.map((id) => id.toLowerCase()));
    const vaults: KodiakVault[] = (await res.json())?.data ?? [];

    return new Map(
      vaults
        .filter((vault) => wantedVaultIds.has(vault.id.toLowerCase()))
        .map((vault) => [vault.id.toLowerCase(), vault.apr] as const),
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
          null;
        const weeklyFees = apyBase == null ? null : (pos.value * (apyBase / 100)) / 52;
        const ohmDepth = Math.max(pos.value - pos.valueExcludingOhm, 0);
        const ohmPct = pos.value > 0 ? ohmDepth / pos.value : 0;

        return {
          name: pos.name,
          displayName: pos.displayName,
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
