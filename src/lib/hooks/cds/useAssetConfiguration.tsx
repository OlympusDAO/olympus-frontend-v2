import { useReadContract, useChainId } from "wagmi";
import { ContractName, requireContractAddress } from "@/lib/contracts";
import { useDepositManager } from "./useDepositManager";
import DepositManagerAbi from "@/abis/DepositManager";
import { getTokenAddress } from "@/lib/tokens";

export function useAssetConfiguration(tokenSymbol: "USDS") {
  const chainId = useChainId();

  // Get the facility address to get the deposit manager
  const facilityAddress = chainId
    ? requireContractAddress(ContractName.CONVERTIBLE_DEPOSIT_FACILITY, chainId)
    : undefined;

  // Get deposit manager address
  const { depositManagerAddress } = useDepositManager(facilityAddress);

  // Get the token address
  const tokenAddress = getTokenAddress(tokenSymbol, chainId);

  const {
    data: configuration,
    isLoading,
    isError,
    error,
  } = useReadContract({
    address: depositManagerAddress,
    abi: DepositManagerAbi,
    functionName: "getAssetConfiguration",
    args: [tokenAddress as `0x${string}`],
    query: {
      enabled: !!(depositManagerAddress && tokenAddress),
    },
  });

  return {
    configuration,
    isLoading,
    isError,
    error,
  };
}

// Helper function to format minimum deposit for display
export function formatMinimumDeposit(minimumDeposit: bigint): string {
  return (Number(minimumDeposit) / 1e18).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
