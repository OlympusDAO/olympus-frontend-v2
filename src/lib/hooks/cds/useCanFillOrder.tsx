import { useReadContract } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { useChainId } from "wagmi";
import LimitOrdersABI from "@/abis/LimitOrders";

export const useCanFillOrder = (orderId: bigint | undefined, fillAmount: bigint | undefined) => {
  const chainId = useChainId();

  const limitOrdersAddress = getContractAddress(ContractName.LIMIT_ORDERS, chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: limitOrdersAddress,
    abi: LimitOrdersABI,
    functionName: "canFillOrder",
    args: orderId !== undefined && fillAmount !== undefined ? [orderId, fillAmount] : undefined,
    query: {
      enabled: !!orderId && fillAmount !== undefined && !!limitOrdersAddress,
    },
  });

  return {
    canFill: data?.[0],
    reason: data?.[1],
    effectivePrice: data?.[2],
    isLoading,
    error,
    refetch,
  };
};
