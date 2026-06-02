import { useReadContract, useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import ConvertibleDepositAuctioneerAbi from "@/abis/ConvertibleDepositAuctioneer";

export function useCurrentTickSize() {
  const chainId = useChainId();

  const contractAddress = getContractAddress(ContractName.CONVERTIBLE_DEPOSIT_AUCTIONEER, chainId);

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
