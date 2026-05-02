import { useQuery } from "@tanstack/react-query";
import { DEFILLAMA_YIELDS_URL, DEFILLAMA_POOLS } from "@/lib/constants";

interface ReserveYields {
  susdeApy: number;
  susdsApy: number;
}

async function fetchPoolApy(poolId: string): Promise<number> {
  const response = await fetch(`${DEFILLAMA_YIELDS_URL}/chart/${poolId}`);
  if (!response.ok) return 0;
  const data = await response.json();
  const latest = data?.data?.[data.data.length - 1];
  return latest?.apy ?? 0;
}

export function useReserveYields() {
  return useQuery<ReserveYields>({
    queryKey: ["reserveYields"],
    queryFn: async () => {
      const [susdeApy, susdsApy] = await Promise.all([
        fetchPoolApy(DEFILLAMA_POOLS.SUSDE),
        fetchPoolApy(DEFILLAMA_POOLS.SUSDS),
      ]);
      return { susdeApy, susdsApy };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
