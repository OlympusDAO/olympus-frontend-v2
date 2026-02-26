import { useReadContract } from "wagmi";
import { useChainId } from "wagmi";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";
import { getContractAddress, ContractName } from "@/lib/contracts";

/**
 * Hook to fetch loan data for a specific redemption
 */
export function useRedemptionLoan(
  userAddress?: `0x${string}`,
  redemptionId?: number
) {
  const chainId = useChainId();
  const vaultAddress = getContractAddress(
    ContractName.DEPOSIT_REDEMPTION_VAULT,
    chainId
  );

  const { data, isLoading, error, refetch } = useReadContract({
    address: vaultAddress,
    abi: DepositRedemptionVaultABI,
    functionName: "getRedemptionLoan",
    args:
      userAddress && redemptionId !== undefined
        ? [userAddress, redemptionId]
        : undefined,
    query: {
      enabled: !!userAddress && redemptionId !== undefined && !!vaultAddress,
    },
  });

  const loanData = data;

  // Check if loan exists (dueDate > 0 means loan was created)
  const hasLoan = loanData ? loanData.dueDate > 0 : false;

  return {
    loanData,
    hasLoan,
    isLoading,
    error,
    refetch,
  };
}
