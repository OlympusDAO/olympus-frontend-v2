import { useReadContract, useReadContracts, useAccount, useChainId } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import DepositRedemptionVaultAbi from "@/abis/DepositRedemptionVault";
import ReceiptTokenManagerABI from "@/abis/ReceiptTokenManager";
import { useMemo } from "react";
import { createTokenDisplayName } from "@/lib/utils";

interface UserRedemption {
  redemptionId: number;
  depositToken: `0x${string}`;
  depositPeriod: number;
  redeemableAt: number;
  amount: bigint;
  facility: `0x${string}`;
}

export function usePendingRedemptions() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  const contractAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

  const receiptTokenManagerAddress = getContractAddress(
    ContractName.RECEIPT_TOKEN_MANAGER,
    chainId,
  );

  const facilityAddress = getContractAddress(ContractName.CONVERTIBLE_DEPOSIT_FACILITY, chainId);

  // Get the count of user redemptions
  const { data: redemptionCount, isLoading: isLoadingCount } = useReadContract({
    address: contractAddress,
    abi: DepositRedemptionVaultAbi,
    functionName: "getUserRedemptionCount",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!(contractAddress && userAddress),
    },
  });

  // Prepare contracts array for batch reading individual redemptions
  const redemptionContracts = useMemo(() => {
    if (!contractAddress || !userAddress || !redemptionCount || redemptionCount === 0) {
      return [];
    }

    const count = Number(redemptionCount);
    const contracts = [];

    for (let i = 0; i < count; i++) {
      contracts.push({
        address: contractAddress,
        abi: DepositRedemptionVaultAbi,
        functionName: "getUserRedemption",
        args: [userAddress, i],
      });
    }

    return contracts;
  }, [contractAddress, userAddress, redemptionCount]);

  // Query individual redemptions using useReadContracts
  const { data: redemptionResults = [], isLoading: isLoadingRedemptions } = useReadContracts({
    contracts: redemptionContracts,
    query: {
      enabled: redemptionContracts.length > 0,
    },
  });

  // Process the redemption results
  const redemptions = useMemo(() => {
    if (!redemptionResults.length) return [];

    const processedRedemptions: UserRedemption[] = [];

    redemptionResults.forEach((result, index) => {
      if (result.status === "success" && result.result) {
        //@ts-expect-error - result type is incorrect
        const { depositToken, depositPeriod, redeemableAt, amount, facility } = result.result;

        // Skip canceled redemptions (amount = 0)
        if (amount && amount > 0n) {
          processedRedemptions.push({
            redemptionId: index,
            depositToken: depositToken as `0x${string}`,
            depositPeriod: Number(depositPeriod),
            redeemableAt: Number(redeemableAt),
            amount: amount as bigint,
            facility: facility as `0x${string}`,
          });
        }
      }
    });

    return processedRedemptions;
  }, [redemptionResults]);

  // Prepare contracts to fetch receipt token IDs for each redemption
  const tokenIdContracts = useMemo(() => {
    if (!receiptTokenManagerAddress || !facilityAddress || !redemptions.length) {
      return [];
    }

    return redemptions.map((redemption) => ({
      address: receiptTokenManagerAddress,
      abi: ReceiptTokenManagerABI,
      functionName: "getReceiptTokenId",
      args: [facilityAddress, redemption.depositToken, redemption.depositPeriod, facilityAddress],
    }));
  }, [receiptTokenManagerAddress, facilityAddress, redemptions]);

  // Fetch receipt token IDs
  const { data: tokenIdResults = [], isLoading: isLoadingTokenIds } = useReadContracts({
    contracts: tokenIdContracts,
    query: {
      enabled: tokenIdContracts.length > 0,
    },
  });

  // Prepare contracts to fetch token symbols using the token IDs
  const symbolContracts = useMemo(() => {
    if (!receiptTokenManagerAddress || !tokenIdResults.length) {
      return [];
    }

    return tokenIdResults
      .filter((result) => result.status === "success" && result.result)
      .map((result) => ({
        address: receiptTokenManagerAddress,
        abi: ReceiptTokenManagerABI,
        functionName: "getTokenSymbol",
        args: [result.result],
      }));
  }, [receiptTokenManagerAddress, tokenIdResults]);

  // Fetch token symbols
  const { data: symbolResults = [], isLoading: isLoadingSymbols } = useReadContracts({
    contracts: symbolContracts,
    query: {
      enabled: symbolContracts.length > 0,
    },
  });

  // Transform redemptions to individual pending redemptions
  const individualRedemptions = useMemo(() => {
    return redemptions.map((redemption, index) => {
      // Get the token symbol from the fetched results, fallback to generated name
      let displayName = createTokenDisplayName("USDS", redemption.depositPeriod);

      const symbolResult = symbolResults[index];
      if (symbolResult?.status === "success" && symbolResult?.result) {
        displayName = String(symbolResult.result);
      }

      return {
        redemptionId: redemption.redemptionId,
        asset: redemption.depositToken,
        periodMonths: redemption.depositPeriod,
        amount: redemption.amount,
        displayName,
        redeemableAt: redemption.redeemableAt,
        facility: redemption.facility,
      };
    });
  }, [redemptions, symbolResults]);

  return {
    pendingRedemptions: individualRedemptions,
    allRedemptions: individualRedemptions,
    redemptionCount: Number(redemptionCount || 0),
    isLoading: isLoadingCount || isLoadingRedemptions || isLoadingTokenIds || isLoadingSymbols,
  };
}

export function formatPendingAmount(amount: bigint): string {
  return parseFloat((Number(amount) / 1e18).toFixed(2)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
