import { useReadContract, useChainId, usePublicClient } from "wagmi";
import { ContractName, requireContractAddress } from "@/lib/contracts";
import ConvertibleDepositAuctioneerAbi from "@/abis/ConvertibleDepositAuctioneer";
import { useQuery } from "@tanstack/react-query";
import { formatPeriodDisplayName } from "@/lib/utils";

interface DepositPeriod {
  months: number;
  isEnabled: boolean;
  isPendingEnabled: boolean;
  displayName: string;
}

export function useDepositPeriods() {
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });

  const contractAddress = chainId
    ? requireContractAddress(
        ContractName.CONVERTIBLE_DEPOSIT_AUCTIONEER,
        chainId
      )
    : undefined;

  // Get all available deposit periods
  const { data: rawPeriods, isLoading: isLoadingPeriods } = useReadContract({
    address: contractAddress,
    abi: ConvertibleDepositAuctioneerAbi,
    functionName: "getDepositPeriods",
    query: {
      enabled: !!contractAddress,
    },
  });

  // Check enabled status for each period
  const { data: depositPeriods = [], isLoading: isLoadingStatus } = useQuery({
    queryKey: ["depositPeriodsStatus", contractAddress, rawPeriods],
    queryFn: async () => {
      if (
        !contractAddress ||
        !publicClient ||
        !rawPeriods ||
        rawPeriods.length === 0
      ) {
        return [];
      }

      const periodsWithStatus: DepositPeriod[] = [];

      for (const period of rawPeriods as number[]) {
        try {
          const result = await publicClient.readContract({
            address: contractAddress,
            abi: ConvertibleDepositAuctioneerAbi,
            functionName: "isDepositPeriodEnabled",
            args: [period],
          });

          const [isEnabled, isPendingEnabled] = result;

          periodsWithStatus.push({
            months: period,
            isEnabled: isEnabled as boolean,
            isPendingEnabled: isPendingEnabled as boolean,
            displayName: formatPeriodDisplayName(period),
          });
        } catch (error) {
          console.error(`Failed to check status for period ${period}:`, error);
        }
      }

      // Sort by months ascending
      return periodsWithStatus.sort((a, b) => a.months - b.months);
    },
    enabled: !!(
      contractAddress &&
      chainId &&
      rawPeriods &&
      rawPeriods.length > 0
    ),
  });

  // Filter to only enabled periods
  const enabledPeriods = depositPeriods.filter((period) => period.isEnabled);

  return {
    depositPeriods,
    enabledPeriods,
    isLoading: isLoadingPeriods || isLoadingStatus,
  };
}
