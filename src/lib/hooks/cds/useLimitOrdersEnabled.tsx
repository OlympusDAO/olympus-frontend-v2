import { useReadContract } from "wagmi";
import { useChainId } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import LimitOrdersAbi from "@/abis/LimitOrders";

/**
 * Hook to check if the LimitOrders contract is enabled
 */
export function useLimitOrdersEnabled() {
  const chainId = useChainId();
  const contractAddress = getContractAddress(ContractName.LIMIT_ORDERS, chainId);

  const {
    data: isEnabled,
    isLoading,
    error,
  } = useReadContract({
    address: contractAddress,
    abi: LimitOrdersAbi,
    functionName: "isEnabled",
    query: {
      enabled: !!contractAddress,
    },
  });

  return {
    isEnabled: isEnabled ?? false,
    isLoading,
    error,
  };
}
