import { useReadContract } from "wagmi";
import { useChainId } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";

export function usePreviewExtendLoan(
  userAddress: `0x${string}` | undefined,
  redemptionId: number | undefined,
  months: number | undefined
) {
  const chainId = useChainId();

  const vaultAddress = getContractAddress(
    ContractName.DEPOSIT_REDEMPTION_VAULT,
    chainId
  );

  const { data, isLoading, isError, refetch } = useReadContract({
    address: vaultAddress,
    abi: DepositRedemptionVaultABI,
    functionName: "previewExtendLoan",
    args:
      userAddress && redemptionId !== undefined && months !== undefined
        ? [userAddress, redemptionId, months]
        : undefined,
    query: {
      enabled: !!(userAddress && redemptionId !== undefined && months !== undefined && vaultAddress),
    },
  });

  // data is [newDueDate, interestPayable]
  const newDueDate = data?.[0];
  const interestPayable = data?.[1];

  return {
    newDueDate,
    interestPayable,
    isLoading,
    isError,
    refetch,
  };
}
