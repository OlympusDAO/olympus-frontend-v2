import { useReadContract, useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import OlympusStakingAbi from "@/abis/OlympusStaking";
import { formatUnits } from "viem";

export function useCurrentIndex() {
  const chainId = useChainId();
  const stakingAddress = getContractAddress(ContractName.STAKING, chainId);

  const {
    data: index,
    isLoading,
    error,
  } = useReadContract({
    address: stakingAddress,
    abi: OlympusStakingAbi,
    functionName: "index",
    query: {
      enabled: !!stakingAddress,
    },
  });

  const formattedIndex = index != null ? parseFloat(formatUnits(index as bigint, 9)) : undefined;

  return {
    index: index as bigint | undefined,
    formattedIndex,
    isLoading,
    error,
  };
}
