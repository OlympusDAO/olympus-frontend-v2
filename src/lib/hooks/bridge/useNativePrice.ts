import { useQuery } from "@tanstack/react-query";

const COINGECKO_IDS: Record<string, string> = {
  ETH: "coingecko:ethereum",
  BERA: "coingecko:berachain-bera",
};

/** A chain's native token in USD, for fee display only. Undefined if it can't be read. */
export function useNativePrice(symbol: string): number | undefined {
  const coin = COINGECKO_IDS[symbol];
  const { data } = useQuery({
    queryKey: ["nativePrice", coin],
    enabled: !!coin,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async (): Promise<number | undefined> => {
      const response = await fetch(`https://coins.llama.fi/prices/current/${coin}`);
      if (!response.ok) return undefined;
      const json = await response.json();
      return json.coins?.[coin]?.price;
    },
  });
  return data;
}
