import { useQuery } from "@tanstack/react-query";
import { DEFILLAMA_YIELDS_URL } from "@/lib/constants.ts";
import type { DefiLlamaPool, PoolsResponse } from "@/modules/ohm/utils/defi-llama.ts";

function isOhmPool(pool: DefiLlamaPool): boolean {
  const parts = pool.symbol.toUpperCase().split("-");
  return parts.includes("OHM") || parts.includes("GOHM") || parts[0] === "OHMFRAXBP";
}

async function fetchOhmDefiLlamaPools(): Promise<DefiLlamaPool[]> {
  const res = await fetch(`${DEFILLAMA_YIELDS_URL}/pools`);
  if (!res.ok) throw new Error(`DefiLlama /pools failed: ${res.status}`);
  const json: PoolsResponse = await res.json();
  return json.data.filter(isOhmPool);
}

/** Shared query for OHM/gOHM pools from DefiLlama. Both liquidity and lending hooks build on this. */
export function useDefiLlamaPools() {
  return useQuery<DefiLlamaPool[]>({
    queryKey: ["defiLlamaOhmPools"],
    queryFn: fetchOhmDefiLlamaPools,
    staleTime: 5 * 60_000,
  });
}
