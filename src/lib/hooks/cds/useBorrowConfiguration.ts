import { useReadContract } from "wagmi";
import { useChainId } from "wagmi";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";
import { getContractAddress, ContractName } from "@/lib/contracts";

/**
 * Hook to fetch max borrow percentage for a given asset and facility
 * Returns value in basis points (e.g., 9000 = 90%)
 * If maxBorrowPercentage is 0, borrowing is disabled for this asset/facility combination
 */
export function useMaxBorrowPercentage(asset?: `0x${string}`, facility?: `0x${string}`) {
  const chainId = useChainId();
  const vaultAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

  const { data, isLoading, error } = useReadContract({
    address: vaultAddress,
    abi: DepositRedemptionVaultABI,
    functionName: "getMaxBorrowPercentage",
    args: asset && facility ? [asset, facility] : undefined,
    query: {
      enabled: !!asset && !!facility && !!vaultAddress,
    },
  });

  // Convert from basis points (10000 = 100%) to decimal (0-1)
  const maxBorrowDecimal = data ? Number(data) / 10000 : 0;

  // Check if borrowing is enabled for this asset/facility (maxBorrowPercentage > 0)
  const isBorrowEnabledForAsset = data ? Number(data) > 0 : false;

  return {
    maxBorrowPercentage: data as number | undefined,
    maxBorrowDecimal,
    isBorrowEnabledForAsset,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch annual interest rate for a given asset and facility
 * Returns value in basis points (e.g., 500 = 5%)
 */
export function useAnnualInterestRate(asset?: `0x${string}`, facility?: `0x${string}`) {
  const chainId = useChainId();
  const vaultAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

  const { data, isLoading, error } = useReadContract({
    address: vaultAddress,
    abi: DepositRedemptionVaultABI,
    functionName: "getAnnualInterestRate",
    args: asset && facility ? [asset, facility] : undefined,
    query: {
      enabled: !!asset && !!facility && !!vaultAddress,
    },
  });

  // Convert from basis points to percentage (500 = 5%)
  const annualInterestRatePercentage = data ? Number(data) / 100 : 0;

  return {
    annualInterestRate: data as number | undefined,
    annualInterestRatePercentage,
    isLoading,
    error,
  };
}
