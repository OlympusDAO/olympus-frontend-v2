import { useReadContracts } from "wagmi";
import { useChainId } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import LimitOrdersAbi from "@/abis/LimitOrders";

/**
 * Hook to check which deposit periods are enabled on the LimitOrders contract
 * A deposit period is enabled if receiptTokens(depositPeriod) returns a non-zero address
 */
export function useLimitOrderDepositPeriods(depositPeriods: number[]) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(ContractName.LIMIT_ORDERS, chainId);

  const { data, isLoading, error } = useReadContracts({
    contracts: depositPeriods.map((period) => ({
      address: contractAddress,
      abi: LimitOrdersAbi,
      functionName: "receiptTokens",
      args: [period],
    })),
    query: {
      enabled: !!contractAddress && depositPeriods.length > 0,
    },
  });

  // Filter deposit periods where receiptToken is not address(0)
  const enabledPeriods = depositPeriods.filter((_period, index) => {
    const result = data?.[index]?.result as `0x${string}` | undefined;
    return result && result !== "0x0000000000000000000000000000000000000000";
  });

  return {
    enabledPeriods,
    isLoading,
    error,
  };
}
