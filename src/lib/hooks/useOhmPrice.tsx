import { useReadContract } from "wagmi";
import { useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import PriceAbi from "@/abis/Price";
import { formatUnits } from "viem";

export function useOhmPrice() {
  const chainId = useChainId();
  const priceContractAddress = getContractAddress(ContractName.PRICE, chainId);

  const { data: currentPrice, isLoading, error } = useReadContract({
    address: priceContractAddress,
    abi: PriceAbi,
    functionName: "getCurrentPrice",
    query: {
      enabled: !!priceContractAddress,
    },
  });

  // Format the price to a readable number (assuming 18 decimals)
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