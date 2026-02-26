import { useReadContract } from "wagmi";
import { useChainId } from "wagmi";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { formatEther } from "viem";

type PreviewBorrowResult = {
  principal: bigint;
  interest: bigint;
  dueDate: number;
};

/**
 * Hook to preview borrowing against a redemption
 * Returns the principal amount, interest, and due date
 */
export function usePreviewBorrow(
  userAddress?: `0x${string}`,
  redemptionId?: number
) {
  const chainId = useChainId();
  const vaultAddress = getContractAddress(
    ContractName.DEPOSIT_REDEMPTION_VAULT,
    chainId
  );

  const { data, isLoading, error } = useReadContract({
    address: vaultAddress,
    abi: DepositRedemptionVaultABI,
    functionName: "previewBorrowAgainstRedemption",
    args:
      userAddress && redemptionId !== undefined
        ? [userAddress, redemptionId]
        : undefined,
    query: {
      enabled: !!userAddress && redemptionId !== undefined && !!vaultAddress,
    },
  });

  // Parse the response - previewBorrowAgainstRedemption returns (uint256 principal, uint256 interest, uint48 dueDate)
  const result = data as [bigint, bigint, number] | undefined;

  const previewData: PreviewBorrowResult | undefined = result
    ? {
        principal: result[0],
        interest: result[1],
        dueDate: result[2],
      }
    : undefined;

  // Format values for display
  const formattedPrincipal = previewData
    ? formatEther(previewData.principal)
    : "0";
  const formattedInterest = previewData ? formatEther(previewData.interest) : "0";
  const dueDateFormatted = previewData
    ? new Date(previewData.dueDate * 1000).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return {
    previewData,
    formattedPrincipal,
    formattedInterest,
    dueDateFormatted,
    isLoading,
    error,
  };
}
