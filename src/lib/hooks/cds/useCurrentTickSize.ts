import { useReadContract, useChainId } from "wagmi";
import { ContractName, requireContractAddress } from "@/lib/contracts";
import ConvertibleDepositAuctioneerAbi from "@/abis/ConvertibleDepositAuctioneer";

export function useCurrentTickSize() {
  const chainId = useChainId();

  const contractAddress = chainId
    ? requireContractAddress(ContractName.CONVERTIBLE_DEPOSIT_AUCTIONEER, chainId)
    : undefined;

  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: ConvertibleDepositAuctioneerAbi,
    functionName: "getCurrentTickSize",
    query: {
      enabled: !!contractAddress,
    },
  });

  return {
    currentTickSize: data,
    isLoading,
    error,
  };
}
