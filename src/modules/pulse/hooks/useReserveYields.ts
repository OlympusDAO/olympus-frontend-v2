import { useQuery } from "@tanstack/react-query";
import { DEFILLAMA_YIELDS_URL, DEFILLAMA_POOLS, LP_POOL_MAP } from "@/lib/constants";

interface ReserveYields {
  susdeApy: number;
  susdsApy: number;
  lpApys: Record<string, number>; // tokenRecord name → fee APY %
}

async function fetchPoolApy(poolId: string): Promise<number> {
  const response = await fetch(`${DEFILLAMA_YIELDS_URL}/chart/${poolId}`);
  if (!response.ok) return 0;
  const data = await response.json();
  const latest = data?.data?.[data.data.length - 1];
  return latest?.apy ?? 0;
}

async function fetchLpApys(): Promise<Record<string, number>> {
  // Fetch all pools in one request and filter to our LP pool IDs
  const response = await fetch(`${DEFILLAMA_YIELDS_URL}/pools`);
  if (!response.ok) return {};

  const data = await response.json();
  const pools: Array<{ pool: string; apyBase: number | null }> = data?.data ?? [];

  // Build reverse map: DeFiLlama poolId → apyBase
  const poolApyMap = new Map<string, number>();
  for (const p of pools) {
    poolApyMap.set(p.pool, p.apyBase ?? 0);
  }

  // Map back to tokenRecord names
  const result: Record<string, number> = {};
  for (const [tokenName, poolId] of Object.entries(LP_POOL_MAP)) {
    result[tokenName] = poolApyMap.get(poolId) ?? 0;
  }
  return result;
}

export function useReserveYields() {
  return useQuery<ReserveYields>({
    queryKey: ["reserveYields"],
    queryFn: async () => {
      const [susdeApy, susdsApy, lpApys] = await Promise.all([
        fetchPoolApy(DEFILLAMA_POOLS.SUSDE),
        fetchPoolApy(DEFILLAMA_POOLS.SUSDS),
        fetchLpApys(),
      ]);
      return { susdeApy, susdsApy, lpApys };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
