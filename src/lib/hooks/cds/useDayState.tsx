import { useReadContract, useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import ConvertibleDepositAuctioneerAbi from "@/abis/ConvertibleDepositAuctioneer";

export function useDayState() {
  const chainId = useChainId();

  const contractAddress = getContractAddress(ContractName.CONVERTIBLE_DEPOSIT_AUCTIONEER, chainId);

  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: ConvertibleDepositAuctioneerAbi,
    functionName: "getDayState",
    query: {
      enabled: !!contractAddress,
    },
  });

  return {
    dayState: data,
    isLoading,
    error,
  };
}
