import { useReadContract } from "wagmi";
import { useChainId } from "wagmi";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";
import { getContractAddress, ContractName } from "@/lib/contracts";

export function useUserRedemptions(userAddress?: `0x${string}`) {
  const chainId = useChainId();
  const vaultAddress = getContractAddress(
    ContractName.DEPOSIT_REDEMPTION_VAULT,
    chainId
  );

  const { data, isLoading, error, refetch } = useReadContract({
    address: vaultAddress,
    abi: DepositRedemptionVaultABI,
    functionName: "getUserRedemptions",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && !!vaultAddress,
    },
  });

  return {
    redemptions: data || [],
    isLoading,
    error,
    refetch,
  };
}
