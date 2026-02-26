import { useReadContract, useChainId } from "wagmi";
import { ContractName, requireContractAddress } from "@/lib/contracts";
import ConvertibleDepositAuctioneerAbi from "@/abis/ConvertibleDepositAuctioneer";
import { useRef, useEffect } from "react";

interface UseCurrentTickParams {
  depositPeriod: number;
  enabled?: boolean;
}

export function useCurrentTick({
  depositPeriod,
  enabled = true,
}: UseCurrentTickParams) {
  const chainId = useChainId();
  const prevDepositPeriod = useRef(depositPeriod);
  const shouldPoll = useRef(true);

  // Reset polling flag when deposit period changes
  useEffect(() => {
    if (prevDepositPeriod.current !== depositPeriod) {
      shouldPoll.current = false;
      prevDepositPeriod.current = depositPeriod;
      // Re-enable polling after initial fetch
      const timer = setTimeout(() => {
        shouldPoll.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [depositPeriod]);

  const contractAddress = chainId
    ? requireContractAddress(
        ContractName.CONVERTIBLE_DEPOSIT_AUCTIONEER,
        chainId
      )
    : undefined;

  const {
    data: tickData,
    isLoading,
    isError,
    error,
  } = useReadContract({
    address: contractAddress,
    abi: ConvertibleDepositAuctioneerAbi,
    functionName: "getCurrentTick",
    args: [depositPeriod],
    query: {
      enabled: !!(contractAddress && depositPeriod && enabled),
      // Poll every 5 seconds to keep capacity display updated, but pause when switching terms
      refetchInterval: shouldPoll.current ? 5000 : false,
    },
  });

  return {
    tickData,
    isLoading,
    isError,
    error,
  };
}
