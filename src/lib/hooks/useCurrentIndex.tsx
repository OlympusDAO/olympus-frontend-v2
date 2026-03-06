import { useReadContract } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import OlympusStakingAbi from "@/abis/OlympusStaking";
import { formatUnits } from "viem";
import { mainnet } from "@/lib/chains";

export function useCurrentIndex() {
  const stakingAddress = getContractAddress(ContractName.STAKING, mainnet.id);

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
