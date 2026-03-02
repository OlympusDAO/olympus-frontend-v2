import { useReadContract } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { useChainId } from "wagmi";
import LimitOrdersABI from "@/abis/LimitOrders";

export const useOrderRemaining = (orderId: bigint | undefined) => {
  const chainId = useChainId();

  const limitOrdersAddress = getContractAddress(ContractName.LIMIT_ORDERS, chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: limitOrdersAddress,
    abi: LimitOrdersABI,
    functionName: "getRemaining",
    args: orderId !== undefined ? [orderId] : undefined,
    query: {
      enabled: !!orderId && !!limitOrdersAddress,
      refetchInterval: 600000, // 10 minutes in milliseconds
    },
  });

  return {
    deposit: data?.[0],
    incentive: data?.[1],
    isLoading,
    error,
    refetch,
  };
};
