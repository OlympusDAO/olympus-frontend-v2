import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import USDSIcon from "@/assets/USDS.png";
import cdUSDSIcon from "@/assets/cdUSDS.png";
import { useAccount, useChainId } from "wagmi";
import { ActiveLoans } from "../components/active-loans";
import { useUserRedemptions } from "@/lib/hooks/cds/useUserRedemptions";
import {
  useMaxBorrowPercentage,
  useAnnualInterestRate,
} from "@/lib/hooks/cds/useBorrowConfiguration";
import { useBorrowAgainstRedemption } from "@/lib/hooks/cds/useBorrowAgainstRedemption";
import { useReadContracts } from "wagmi";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { getTokenAddress } from "@/lib/tokens";
import { formatEther } from "viem";
import { formatTermSuffix } from "@/lib/utils";
import { trackBorrowCreate } from "@/lib/analytics";
import { Link, useSearchParams } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export const BorrowPage = () => {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const [searchParams] = useSearchParams();
  const [selectedRedemptionIndex, setSelectedRedemptionIndex] =
    useState<number>(0);

  // Fetch user redemptions
  const { redemptions, isLoading: isLoadingRedemptions } =
    useUserRedemptions(userAddress);

  const vaultAddress = getContractAddress(
    ContractName.DEPOSIT_REDEMPTION_VAULT,
    chainId
  );

  // Get USDS asset address and facility address to check if borrowing is globally enabled
  const usdsAddress = getTokenAddress("USDS", chainId);
  const facilityAddress = getContractAddress(
    ContractName.CONVERTIBLE_DEPOSIT_FACILITY,
    chainId
  );

  // Check if borrowing is enabled globally for USDS/facility
  const { isBorrowEnabledForAsset: isGlobalBorrowEnabled } =
    useMaxBorrowPercentage(usdsAddress, facilityAddress);

  // Fetch loan data for all redemptions to check which ones have active loans
  const loanContracts = useMemo(() => {
    if (!userAddress || !vaultAddress || redemptions.length === 0) return [];

    return redemptions.map((_, index) => ({
      address: vaultAddress,
      abi: DepositRedemptionVaultABI,
      functionName: "getRedemptionLoan",
      args: [userAddress, index],
    }));
  }, [userAddress, vaultAddress, redemptions]);

  const { data: loansData } = useReadContracts({
    contracts: loanContracts,
  });

  // Fetch max borrow percentage for all redemptions
  const borrowConfigContracts = useMemo(() => {
    if (!vaultAddress || redemptions.length === 0) return [];
    return redemptions.map((redemption) => ({
      address: vaultAddress,
      abi: DepositRedemptionVaultABI,
      functionName: "getMaxBorrowPercentage",
      args: [redemption.depositToken, redemption.facility],
    }));
  }, [vaultAddress, redemptions]);

  const { data: borrowConfigData } = useReadContracts({
    contracts: borrowConfigContracts,
  });

  // Calculate detailed status for redemptions to determine appropriate empty state message
  const redemptionStatus = useMemo(() => {
    if (!loansData || !borrowConfigData || redemptions.length === 0) {
      return {
        hasRedemptions: redemptions.length > 0,
        hasNoActiveLoans: false,
        hasBorrowEnabled: false,
        availableCount: 0,
      };
    }

    let noActiveLoansCount = 0;
    let borrowEnabledCount = 0;
    let anyBorrowEnabled = false;

    const available = redemptions
      .map((redemption, index) => ({ redemption, originalIndex: index }))
      .filter(({ originalIndex }) => {
        // Check loan status
        const loanResult = loansData[originalIndex];
        if (loanResult?.status !== "success") return false;

        const loan = loanResult.result as unknown as { dueDate: number };
        const hasNoActiveLoan = !loan || loan.dueDate === 0;

        // Check borrow config
        const borrowConfigResult = borrowConfigData[originalIndex];
        const isBorrowEnabled =
          borrowConfigResult?.status === "success" &&
          Number(borrowConfigResult.result) > 0;

        if (isBorrowEnabled) {
          anyBorrowEnabled = true;
        }

        if (hasNoActiveLoan) {
          noActiveLoansCount++;

          if (isBorrowEnabled) {
            borrowEnabledCount++;
            return true;
          }
        }
        return false;
      });

    return {
      hasRedemptions: redemptions.length > 0,
      hasNoActiveLoans: noActiveLoansCount > 0,
      hasBorrowEnabled: borrowEnabledCount > 0,
      anyBorrowEnabled,
      availableCount: available.length,
      availableRedemptions: available,
    };
  }, [redemptions, loansData, borrowConfigData]);

  const availableRedemptions = redemptionStatus.availableRedemptions || [];

  // Auto-select redemption from URL parameter
  useMemo(() => {
    const redemptionIdParam = searchParams.get("redemptionId");
    if (redemptionIdParam) {
      const redemptionId = parseInt(redemptionIdParam);
      const index = availableRedemptions.findIndex(
        (item) => item.originalIndex === redemptionId
      );
      if (index !== -1 && index !== selectedRedemptionIndex) {
        setSelectedRedemptionIndex(index);
      }
    }
  }, [searchParams, availableRedemptions, selectedRedemptionIndex]);

  // Get selected redemption
  const selectedRedemption =
    availableRedemptions[selectedRedemptionIndex]?.redemption;

  // Fetch borrow configuration for selected redemption
  const { maxBorrowDecimal, isBorrowEnabledForAsset } = useMaxBorrowPercentage(
    selectedRedemption?.depositToken,
    selectedRedemption?.facility
  );

  const { annualInterestRatePercentage } = useAnnualInterestRate(
    selectedRedemption?.depositToken,
    selectedRedemption?.facility
  );

  // Borrow transaction hook
  const {
    borrowAgainstRedemption,
    isPending,
    isSuccess: isBorrowSuccess,
    hash: borrowHash,
  } = useBorrowAgainstRedemption();

  // Calculate collateral amount (always uses full redemption)
  const collateralAmount = selectedRedemption
    ? formatEther(selectedRedemption.amount)
    : "0";

  // Calculate borrow amount (always max based on full redemption)
  const borrowAmount = useMemo(() => {
    if (!selectedRedemption || !maxBorrowDecimal) return "0";
    return (parseFloat(collateralAmount) * maxBorrowDecimal).toFixed(2);
  }, [collateralAmount, maxBorrowDecimal, selectedRedemption]);

  useEffect(() => {
    if (isBorrowSuccess) {
      trackBorrowCreate({
        collateralAmount,
        borrowAmount,
        txHash: borrowHash,
      });
    }
  }, [isBorrowSuccess, collateralAmount, borrowAmount, borrowHash]);

  // Calculate LTV (will always be maxBorrowDecimal since we use full redemption)
  const currentLTV = useMemo(() => {
    return (maxBorrowDecimal * 100).toFixed(0);
  }, [maxBorrowDecimal]);

  // Calculate loan due date (current time + redemption period in months)
  const loanDueDate = useMemo(() => {
    if (!selectedRedemption) return null;

    const monthsInSeconds =
      selectedRedemption.depositPeriod * 30 * 24 * 60 * 60; // Approximate month as 30 days
    const dueDateTimestamp = Math.floor(Date.now() / 1000) + monthsInSeconds;
    return new Date(dueDateTimestamp * 1000);
  }, [selectedRedemption]);

  // Validation logic for borrow button
  const isBorrowValid = useMemo(() => {
    // Check if wallet is connected
    if (!userAddress)
      return { valid: false, reason: "Connect wallet to borrow" };

    // Check if user has available redemptions
    if (availableRedemptions.length === 0)
      return { valid: false, reason: "No available redemptions" };

    // Check if borrowing is enabled for this asset/facility (maxBorrowPercentage > 0)
    if (!isBorrowEnabledForAsset)
      return { valid: false, reason: "Borrowing disabled for this asset" };

    // Check if borrow amount is valid
    if (!borrowAmount || borrowAmount === "0") {
      return { valid: false, reason: "No borrowable amount available" };
    }

    return { valid: true, reason: "" };
  }, [
    userAddress,
    availableRedemptions.length,
    isBorrowEnabledForAsset,
    borrowAmount,
  ]);

  const handleBorrow = () => {
    if (isBorrowValid.valid && selectedRedemption) {
      // Get the original redemption index from availableRedemptions
      const originalRedemptionId =
        availableRedemptions[selectedRedemptionIndex]?.originalIndex;
      if (originalRedemptionId !== undefined) {
        borrowAgainstRedemption({
          redemptionId: originalRedemptionId,
        });
      }
    }
  };

  // Display token name for selected redemption
  const selectedTokenName = selectedRedemption
    ? `cdUSDS-${formatTermSuffix(selectedRedemption.depositPeriod)}`
    : "cdUSDS-3m";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-3">Create Loan</h2>

      {/* Show message if no redemptions available or borrowing disabled */}
      {!isLoadingRedemptions &&
        (availableRedemptions.length === 0 || !isGlobalBorrowEnabled) && (
          <Card className="p-6">
            <div className="text-center py-8">
              <p className="text-secondary-t mb-4">
                {!isGlobalBorrowEnabled
                  ? "Borrowing is currently disabled."
                  : !redemptionStatus.hasRedemptions
                  ? "You don't have any convertible deposit tokens to use as collateral."
                  : !redemptionStatus.hasNoActiveLoans
                  ? "All your redemptions already have active loans."
                  : "Borrowing is currently disabled for your available assets."}
              </p>
              {!redemptionStatus.hasRedemptions && isGlobalBorrowEnabled && (
                <Link to="/">
                  <Button>Go to Convertible Deposits</Button>
                </Link>
              )}
            </div>
          </Card>
        )}

      {/* Show create position form if redemptions exist and borrowing is enabled */}
      {!isLoadingRedemptions &&
        availableRedemptions.length > 0 &&
        isGlobalBorrowEnabled && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Borrow Amount */}
            <Card className="p-6 space-y-6">
              <div>
                <label className="text-sm text-secondary-t mb-3 block">
                  Select Redemption
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full flex items-center justify-between gap-2 rounded-full bg-surface-a3 p-4 border border-a3-b hover:bg-surface-a5">
                      <div className="flex items-center gap-2">
                        <img
                          src={cdUSDSIcon}
                          alt="cdUSDS"
                          className="w-6 h-6"
                        />
                        <div className="text-left">
                          <div className="font-medium">{selectedTokenName}</div>
                          <div className="text-xs text-secondary-t">
                            {parseFloat(collateralAmount).toFixed(2)} available
                          </div>
                        </div>
                      </div>
                      <span className="text-xs">▼</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[300px]">
                    {availableRedemptions.map(
                      ({ redemption, originalIndex }, index) => {
                        const tokenName = `cdUSDS-${formatTermSuffix(
                          redemption.depositPeriod
                        )}`;
                        const balance = formatEther(redemption.amount);
                        return (
                          <DropdownMenuItem
                            key={originalIndex}
                            onClick={() => setSelectedRedemptionIndex(index)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <img
                                  src={cdUSDSIcon}
                                  alt="cdUSDS"
                                  className="w-4 h-4"
                                />
                                <span>{tokenName}</span>
                              </div>
                              <span className="text-xs text-secondary-t">
                                {parseFloat(balance).toFixed(2)}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        );
                      }
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">
                    You will receive
                  </label>
                </div>
                <div className="relative">
                  <div className="text-3xl h-12 flex items-center font-medium">
                    {parseFloat(borrowAmount).toFixed(2)}
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-full bg-surface-a5 p-2 border border-a5-b">
                      <img src={USDSIcon} alt="USDS" className="w-5 h-5" />
                      <span className="font-medium text-sm">USDS</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-a5-b">
                <span className="text-sm text-secondary-t">Collateral</span>
                <div className="flex items-center gap-2">
                  <img src={cdUSDSIcon} alt="cdUSDS" className="w-4 h-4" />
                  <span className="font-medium">
                    {parseFloat(collateralAmount).toFixed(2)}{" "}
                    {selectedTokenName}
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                disabled={!isBorrowValid.valid || isPending}
                onClick={handleBorrow}
                title={!isBorrowValid.valid ? isBorrowValid.reason : undefined}
              >
                {isPending
                  ? "Borrowing..."
                  : !isBorrowValid.valid
                  ? isBorrowValid.reason
                  : `Borrow ${parseFloat(borrowAmount).toFixed(2)} USDS`}
              </Button>
            </Card>

            {/* Right: Loan Terms */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Loan Terms</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-a5-b">
                  <span className="text-sm text-secondary-t">
                    Loan-to-Value
                  </span>
                  <span className="font-medium">{currentLTV}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-a5-b">
                  <span className="text-sm text-secondary-t">Borrow APY</span>
                  <span className="font-medium">
                    {annualInterestRatePercentage.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-secondary-t">Loan Expires</span>
                  <span className="font-medium">
                    {loanDueDate
                      ? loanDueDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "-"}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-surface-a3 rounded-xl border border-a3-b">
                <div className="text-xs text-secondary-t mb-2">Important</div>
                <div className="text-sm">
                  Repay or extend your loan before the expiration date to avoid
                  default. This loan has no price-based liquidation risk.
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <ActiveLoans />
    </div>
  );
};
