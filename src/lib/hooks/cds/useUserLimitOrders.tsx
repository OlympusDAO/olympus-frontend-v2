import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { useChainId } from "wagmi";
import LimitOrdersABI from "@/abis/LimitOrders";
import type { ContractFunctionReturnType } from "viem";

type LimitOrderData = ContractFunctionReturnType<typeof LimitOrdersABI, "view", "getOrder">;

export const useUserLimitOrders = () => {
  const { address } = useAccount();
  const chainId = useChainId();

  const limitOrdersAddress = getContractAddress(ContractName.LIMIT_ORDERS, chainId);

  // Get user's order IDs (poll every 10 minutes)
  const {
    data: orderIds,
    isLoading: isLoadingIds,
    error: idsError,
    refetch: refetchIds,
  } = useReadContract({
    address: limitOrdersAddress,
    abi: LimitOrdersABI,
    functionName: "getOrdersForUser",
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && !!limitOrdersAddress,
      refetchInterval: 600000, // 10 minutes in milliseconds
    },
  });

  // Get order details for each ID
  const orderContracts =
    (orderIds as bigint[] | undefined)?.map((id) => ({
      address: limitOrdersAddress,
      abi: LimitOrdersABI,
      functionName: "getOrder",
      args: [id],
    })) || [];

  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    error: ordersError,
    refetch: refetchOrders,
  } = useReadContracts({
    contracts: orderContracts,
    query: {
      enabled: !!orderIds && orderIds.length > 0 && !!limitOrdersAddress,
      refetchInterval: 600000, // 10 minutes in milliseconds
    },
  });

  // Combine order IDs with their data, filter out inactive orders
  const orders =
    orderIds && ordersData
      ? (orderIds as bigint[])
          .map((id, index) => ({
            id,
            data: ordersData[index]?.result as LimitOrderData | undefined,
          }))
          .filter((order) => order.data?.active) // Only show active orders
      : [];

  const refetch = () => {
    refetchIds();
    refetchOrders();
  };

  return {
    orders,
    isLoading: isLoadingIds || isLoadingOrders,
    error: idsError || ordersError,
    refetch,
  };
};
