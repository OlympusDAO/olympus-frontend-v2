import { useQuery } from "@tanstack/react-query";
import { DEFILLAMA_YIELDS_URL, LP_POOL_MAP } from "@/lib/constants";
import { mapProjectToName, CHAIN_NAME_TO_ID } from "@/modules/ohm/utils/defi-llama";
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

interface DefiLlamaPoolEntry {
  pool: string;
  chain: string;
  project: string;
  apyBase: number | null;
}

async function fetchDefiLlamaPoolMeta(): Promise<
  Map<string, { project: string; chain: string; apyBase: number }>
> {
  const response = await fetch(`${DEFILLAMA_YIELDS_URL}/pools`);
  if (!response.ok) return new Map();
  const data = await response.json();
  const pools: DefiLlamaPoolEntry[] = data?.data ?? [];

  const map = new Map<string, { project: string; chain: string; apyBase: number }>();
  for (const p of pools) {
    map.set(p.pool, {
      project: p.project,
      chain: p.chain,
      apyBase: p.apyBase ?? 0,
    });
  }
  return map;
}

export function useLpPoolsData() {
  const { data: reserves } = useReserveBalances();

  return useQuery<LpPoolRow[]>({
    queryKey: ["lpPoolsData"],
    enabled: (reserves?.lpPositions?.length ?? 0) > 0,
    queryFn: async () => {
      const meta = await fetchDefiLlamaPoolMeta();
      const lpPositions = reserves?.lpPositions ?? [];

      return lpPositions.map((pos) => {
        const poolId = LP_POOL_MAP[pos.name];
        const poolMeta = poolId ? meta.get(poolId) : undefined;

        const protocol = poolMeta ? mapProjectToName(poolMeta.project) : "Unknown";
        const chain = poolMeta?.chain ?? "—";
        const EXTRA_CHAIN_IDS: Record<string, number> = { Berachain: 80094 };
        const chainId =
          chain !== "—" ? (CHAIN_NAME_TO_ID[chain] ?? EXTRA_CHAIN_IDS[chain] ?? 0) : 0;
        const apyBase = poolMeta?.apyBase ?? 0;
        const weeklyFees = (pos.value * (apyBase / 100)) / 52;
        const ohmPct = 0.5;
        const ohmDepth = pos.value * ohmPct;

        return {
          name: pos.name,
          protocol,
          chain,
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
