import { useReadContracts, useChainId } from "wagmi";
import { ContractName, requireContractAddress } from "@/lib/contracts";
import ConvertibleDepositAuctioneerAbi from "@/abis/ConvertibleDepositAuctioneer";

export function useAuctionParameters() {
  const chainId = useChainId();

  const contractAddress = chainId
    ? requireContractAddress(
        ContractName.CONVERTIBLE_DEPOSIT_AUCTIONEER,
        chainId
      )
    : undefined;

  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi: ConvertibleDepositAuctioneerAbi,
        functionName: "getAuctionParameters",
      },
      {
        address: contractAddress,
        abi: ConvertibleDepositAuctioneerAbi,
        functionName: "getTickStep",
      },
      {
        address: contractAddress,
        abi: ConvertibleDepositAuctioneerAbi,
        functionName: "getDepositPeriodsCount",
      },
      {
        address: contractAddress,
        abi: ConvertibleDepositAuctioneerAbi,
        functionName: "getMinimumBid",
      },
    ],
    query: {
      enabled: !!contractAddress,
    },
  });

  const auctionParameters = data?.[0]?.result;
  const tickStep = data?.[1]?.result;
  const depositPeriodsCount = data?.[2]?.result;
  const minimumBid = data?.[3]?.result;

  // If target is 0, all auctions across all deposit periods are disabled
  const isAuctionDisabled = auctionParameters?.target === 0n;

  return {
    auctionParameters,
    target: auctionParameters?.target,
    tickSize: auctionParameters?.tickSize,
    minPrice: auctionParameters?.minPrice,
    tickStep,
    depositPeriodsCount,
    minimumBid,
    isAuctionDisabled,
    isLoading,
    error,
  };
}
