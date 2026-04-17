import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { TokenBigInput } from "@/components/ui/token-big-input";
import { RiInformationLine } from "@remixicon/react";
import { useAccount, useChainId } from "wagmi";
import { BorrowActiveLoans } from "../components/borrow-active-loans.tsx";
import { useUserRedemptions } from "@/lib/hooks/cds/useUserRedemptions";
import {
  useMaxBorrowPercentage,
  useAnnualInterestRate,
} from "@/lib/hooks/cds/useBorrowConfiguration";
import { useBorrowAgainstRedemption } from "@/lib/hooks/cds/useBorrowAgainstRedemption";
import { useReadContracts } from "wagmi";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import { formatEther } from "viem";
import { formatTermSuffix } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "@/components/icon";
import type { TokenWithBalance } from "@/lib/hooks/useToken";

interface BorrowFormValues {
  collateralAmount: string;
  borrowAmount: string;
}

export const BorrowPage = () => {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const [searchParams] = useSearchParams();

  const form = useForm<BorrowFormValues>({
    defaultValues: {
      collateralAmount: "",
      borrowAmount: "",
    },
  });

  const collateralAmount = form.watch("collateralAmount");
  const borrowAmount = form.watch("borrowAmount");
  const [selectedRedemptionIndex, setSelectedRedemptionIndex] = useState<number>(0);

  const { redemptions, isLoading: isLoadingRedemptions } = useUserRedemptions(userAddress);

  const vaultAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);
  const usdsAddress = getTokenAddress(TokenName.USDS, chainId);
  const facilityAddress = getContractAddress(ContractName.CONVERTIBLE_DEPOSIT_FACILITY, chainId);

  const { isBorrowEnabledForAsset: isGlobalBorrowEnabled } = useMaxBorrowPercentage(
    usdsAddress,
    facilityAddress,
  );

  const loanContracts = useMemo(() => {
    if (!userAddress || !vaultAddress || redemptions.length === 0) return [];
    return redemptions.map((_, index) => ({
      address: vaultAddress,
      abi: DepositRedemptionVaultABI,
      functionName: "getRedemptionLoan" as const,
      args: [userAddress, index] as const,
    }));
  }, [userAddress, vaultAddress, redemptions]);

  const { data: loansData } = useReadContracts({ contracts: loanContracts });

  const borrowConfigContracts = useMemo(() => {
    if (!vaultAddress || redemptions.length === 0) return [];
    return redemptions.map((redemption) => ({
      address: vaultAddress,
      abi: DepositRedemptionVaultABI,
      functionName: "getMaxBorrowPercentage" as const,
      args: [redemption.depositToken, redemption.facility] as const,
    }));
  }, [vaultAddress, redemptions]);

  const { data: borrowConfigData } = useReadContracts({ contracts: borrowConfigContracts });

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

    const available = redemptions
      .map((redemption, index) => ({ redemption, originalIndex: index }))
      .filter(({ originalIndex }) => {
        const loanResult = loansData[originalIndex];
        if (loanResult?.status !== "success") return false;

        const loan = loanResult.result as unknown as { dueDate: number };
        const hasNoActiveLoan = !loan || loan.dueDate === 0;

        const borrowConfigResult = borrowConfigData[originalIndex];
        const isBorrowEnabled =
          borrowConfigResult?.status === "success" && Number(borrowConfigResult.result) > 0;

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
      availableCount: available.length,
      availableRedemptions: available,
    };
  }, [redemptions, loansData, borrowConfigData]);

  const availableRedemptions = redemptionStatus.availableRedemptions || [];

  // Auto-select redemption from URL parameter
  useMemo(() => {
    const redemptionIdParam = searchParams.get("redemptionId");
    if (redemptionIdParam) {
      const redemptionId = parseInt(redemptionIdParam, 10);
      const index = availableRedemptions.findIndex((item) => item.originalIndex === redemptionId);
      if (index !== -1 && index !== selectedRedemptionIndex) {
        setSelectedRedemptionIndex(index);
      }
    }
  }, [searchParams, availableRedemptions, selectedRedemptionIndex]);

  const selectedRedemption = availableRedemptions[selectedRedemptionIndex]?.redemption;

  const { maxBorrowDecimal, isBorrowEnabledForAsset } = useMaxBorrowPercentage(
    selectedRedemption?.depositToken,
    selectedRedemption?.facility,
  );

  const { annualInterestRatePercentage } = useAnnualInterestRate(
    selectedRedemption?.depositToken,
    selectedRedemption?.facility,
  );

  const { borrowAgainstRedemption, isPending } = useBorrowAgainstRedemption();

  const availableCollateral = selectedRedemption ? formatEther(selectedRedemption.amount) : "0";

  const currentLTV = useMemo(() => {
    if (!collateralAmount || !borrowAmount || parseFloat(collateralAmount) === 0) return 0;
    return (parseFloat(borrowAmount) / parseFloat(collateralAmount)) * 100;
  }, [collateralAmount, borrowAmount]);

  const usdsToken: TokenWithBalance = {
    addresses: {},
    address: usdsAddress,
    symbol: "USDS",
    decimals: 18,
    icon: "USDSColorTokenIcon",
    balance: 0n,
    formattedBalance: "0",
    price: 1,
  };

  const redemptionTokens = useMemo(() => {
    return availableRedemptions.map(({ redemption, originalIndex }) => ({
      addresses: {} as TokenWithBalance["addresses"],
      address: redemption.depositToken,
      symbol: `cdUSDS-${formatTermSuffix(redemption.depositPeriod)}`,
      decimals: 18,
      icon: "cdUSDSIcon" as const,
      balance: redemption.amount,
      formattedBalance: formatEther(redemption.amount),
      price: 1,
      originalIndex,
    }));
  }, [availableRedemptions]);

  const selectedRedemptionToken = redemptionTokens[selectedRedemptionIndex] || redemptionTokens[0];

  const handleCollateralChange = (value: string) => {
    form.setValue("collateralAmount", value);
    if (value && maxBorrowDecimal) {
      form.setValue("borrowAmount", (parseFloat(value) * maxBorrowDecimal).toFixed(2));
    }
  };

  const handleBorrowChange = (value: string) => {
    form.setValue("borrowAmount", value);
    if (value && maxBorrowDecimal && maxBorrowDecimal > 0) {
      form.setValue("collateralAmount", (parseFloat(value) / maxBorrowDecimal).toFixed(2));
    }
  };

  const handlePercentageClick = (percentage: number) => {
    handleCollateralChange((parseFloat(availableCollateral) * (percentage / 100)).toFixed(2));
  };

  // Use reference equality — multiple tokens can share the same depositToken address
  const handleTokenChange = (token: TokenWithBalance) => {
    const index = redemptionTokens.findIndex((t) => t === token);
    if (index !== -1) {
      setSelectedRedemptionIndex(index);
      form.setValue("collateralAmount", "");
      form.setValue("borrowAmount", "");
    }
  };

  const isBorrowValid = useMemo(() => {
    if (!userAddress) return { valid: false, reason: "Connect wallet to borrow" };
    if (availableRedemptions.length === 0)
      return { valid: false, reason: "No available redemptions" };
    if (!isBorrowEnabledForAsset)
      return { valid: false, reason: "Borrowing disabled for this asset" };
    if (!collateralAmount || collateralAmount === "0")
      return { valid: false, reason: "Enter collateral amount" };
    if (!borrowAmount || borrowAmount === "0")
      return { valid: false, reason: "No borrowable amount" };
    if (parseFloat(collateralAmount) > parseFloat(availableCollateral))
      return { valid: false, reason: "Insufficient collateral balance" };
    return { valid: true, reason: "" };
  }, [
    userAddress,
    availableRedemptions.length,
    isBorrowEnabledForAsset,
    collateralAmount,
    borrowAmount,
    availableCollateral,
  ]);

  const handleBorrow = () => {
    if (isBorrowValid.valid && selectedRedemption) {
      const originalRedemptionId = availableRedemptions[selectedRedemptionIndex]?.originalIndex;
      if (originalRedemptionId !== undefined) {
        borrowAgainstRedemption({ redemptionId: originalRedemptionId });
      }
    }
  };

  return (
    <div className="">
      <h2 className="text-[20px]/[24px] font-semibold mb-3">Create Position</h2>
      <div className="p-6 rounded-3xl bg-surface-bg-l2 shadow-surface-bg-l2 border border-a5-b">
        {/* Empty / disabled state */}
        {!isLoadingRedemptions && (availableRedemptions.length === 0 || !isGlobalBorrowEnabled) && (
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

        {/* Create position form */}
        {!isLoadingRedemptions && availableRedemptions.length > 0 && isGlobalBorrowEnabled && (
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBorrow();
              }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Left: Form Inputs */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="collateralAmount"
                  render={({ field }) => (
                    <FormItem>
                      <TokenBigInput
                        label="Add Collateral"
                        token={selectedRedemptionToken || redemptionTokens[0]}
                        value={field.value}
                        onChange={handleCollateralChange}
                        onMax={() => handleCollateralChange(availableCollateral)}
                        tokenSelector={
                          redemptionTokens.length > 1
                            ? {
                                tokens: redemptionTokens,
                                selectedToken: selectedRedemptionToken || redemptionTokens[0],
                                onTokenChange: handleTokenChange,
                              }
                            : undefined
                        }
                      />
                    </FormItem>
                  )}
                />

                <Alert type="info">
                  <RiInformationLine size={16} />
                  <AlertDescription className="text-sm font-semibold text-primary-t">
                    Deposit tokens into the Redemption Vault to use them as collateral.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="borrowAmount"
                  render={({ field }) => (
                    <FormItem>
                      <TokenBigInput
                        label="Borrow"
                        token={usdsToken}
                        value={field.value}
                        onChange={handleBorrowChange}
                        balanceLabel="Available:"
                      />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      className="flex-1 cursor-pointer rounded-full border border-a3-b bg-surface-a3 px-3 py-2 text-xs font-semibold text-secondary-t transition-colors hover:bg-surface-a5"
                      onClick={() => handlePercentageClick(pct)}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <Button
                  type="submit"
                  size="md"
                  className="w-full"
                  disabled={!isBorrowValid.valid || isPending}
                  title={!isBorrowValid.valid ? isBorrowValid.reason : undefined}
                >
                  {isPending
                    ? "Borrowing..."
                    : !isBorrowValid.valid
                      ? isBorrowValid.reason
                      : "Borrow"}
                </Button>
              </div>

              {/* Right: Position Info */}
              <div className="flex flex-col gap-4 rounded-2xl border border-a3-b bg-surface-a3 p-4">
                <h3 className="text-sm font-semibold">Position Info</h3>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between border-b border-a3-b py-2">
                    <span className="text-xs text-secondary-t">Collateral</span>
                    <div className="flex items-center gap-1">
                      <Icon name="cdUSDSIcon" className="size-4" />
                      <span className="text-xs font-semibold">
                        {parseFloat(collateralAmount || "0").toFixed(2)}{" "}
                        {selectedRedemptionToken?.symbol || "cdUSDS-3m"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-a3-b py-2">
                    <span className="text-xs text-secondary-t">Debt</span>
                    <div className="flex items-center gap-1">
                      <Icon name="USDSColorTokenIcon" className="size-4" />
                      <span className="text-xs font-semibold">
                        {parseFloat(borrowAmount || "0").toFixed(2)} USDS
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-a3-b py-2">
                    <span className="text-xs text-secondary-t">Borrow APY</span>
                    <span className="text-xs font-semibold">
                      {annualInterestRatePercentage.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-a3-b py-2">
                    <span className="text-xs text-secondary-t">Loan-to-Value</span>
                    <div className="flex items-center gap-1.5">
                      <CircularProgress
                        value={Math.min(currentLTV, 100)}
                        size={16}
                        strokeWidth={3}
                        trackColor="text-secondary/20"
                        indicatorColor={currentLTV > 80 ? "text-red" : "text-primary"}
                      />
                      <span className="text-xs font-semibold">{currentLTV.toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-a3-b py-2">
                    <span className="text-xs text-secondary-t">Liquidation Loan-to-Value</span>
                    <span className="text-xs font-semibold">
                      {(maxBorrowDecimal * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-secondary-t">Liquidation Price</span>
                    <span className="text-xs font-semibold">$20.54</span>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        )}
      </div>

      <BorrowActiveLoans />
    </div>
  );
};
