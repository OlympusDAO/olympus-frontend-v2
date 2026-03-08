import { useOhmPrice } from "@/lib/hooks/useOhmPrice";
import { useReadContract, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { useMockData } from "@/lib/mock/provider";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import gOHMAbi from "@/abis/gOHM";

export function useGohmPrice() {
  const mock = useMockData();
  const chainId = useChainId();
  const { price: ohmPriceBigInt, isLoading: ohmLoading } = useOhmPrice();
  const gohmAddress = getTokenAddress(TokenName.GOHM, chainId);

  // Read index from gOHM contract directly (matches what balanceTo/balanceFrom use)
  const { data: gohmIndex, isLoading: indexLoading } = useReadContract({
    address: gohmAddress,
    abi: gOHMAbi,
    functionName: "index",
    query: {
      enabled: !!gohmAddress,
    },
  });

  if (mock) {
    const price = mock.scenario.prices.gohmPrice;
    return {
      price,
      formattedPrice: price.toFixed(2),
      isLoading: false,
    };
  }

  const ohmPrice = ohmPriceBigInt != null ? parseFloat(formatUnits(ohmPriceBigInt, 18)) : 0;
  const formattedIndex =
    gohmIndex != null ? parseFloat(formatUnits(gohmIndex as bigint, 9)) : undefined;
  const gohmPrice = formattedIndex ? ohmPrice * formattedIndex : 0;

  return {
    price: gohmPrice,
    formattedPrice: gohmPrice > 0 ? gohmPrice.toFixed(2) : "0.00",
    isLoading: ohmLoading || indexLoading,
  };
}
