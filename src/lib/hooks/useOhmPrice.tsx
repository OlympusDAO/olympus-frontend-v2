import { useReadContract, useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import PriceAbi from "@/abis/Price";
import { formatUnits, parseUnits } from "viem";
import { useMockData } from "@/lib/mock/provider";

export function useOhmPrice() {
  const mock = useMockData();

  const chainId = useChainId();
  const priceContractAddress = getContractAddress(ContractName.PRICE, chainId);

  const {
    data: currentPrice,
    isLoading,
    error,
  } = useReadContract({
    address: priceContractAddress,
    abi: PriceAbi,
    functionName: "getCurrentPrice",
    query: {
      enabled: !mock && !!priceContractAddress,
    },
  });

  if (mock) {
    const price = mock.scenario.prices.ohmPrice;
    return {
      price: parseUnits(price.toFixed(2), 18),
      formattedPrice: price.toFixed(2),
      isLoading: false,
      error: null,
    };
  }

  const formattedPrice = currentPrice
    ? parseFloat(formatUnits(currentPrice, 18)).toFixed(2)
    : "0.00";

  return {
    price: currentPrice as bigint | undefined,
    formattedPrice,
    isLoading,
    error,
  };
}
