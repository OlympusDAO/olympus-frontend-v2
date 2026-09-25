import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RiInformationLine } from "@remixicon/react";
import { useAccount, useChainId } from "wagmi";
import { BorrowActiveLoans } from "../components/borrow-active-loans.tsx";
import { useUserRedemptions } from "@/lib/hooks/cds/useUserRedemptions";
import {
  useMaxBorrowPercentage,
  useAnnualInterestRate,
} from "@/lib/hooks/cds/useBorrowConfiguration";
import { useBorrowAgainstRedemption } from "@/lib/hooks/cds/useBorrowAgainstRedemption";
import { usePreviewBorrow } from "@/lib/hooks/cds/usePreviewBorrow";
import {
  selectBorrowableRedemptions,
  type ContractRead,
  type LoanSlot,
} from "@/lib/hooks/cds/borrowable-redemptions";
import { trackBorrowCreate } from "@/lib/analytics";
import { useReadContracts } from "wagmi";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import { formatEther } from "viem";
import { formatTermSuffix } from "@/lib/utils";
import { useSearchParams } from "react-router";
import { Icon } from "@/components/icon";
import { RiExchangeFundsLine } from "@remixicon/react";

const formatAmount = (amount: bigint) => {
  const [whole, fraction = ""] = formatEther(amount).split(".");
  const trimmedFraction = fraction.replace(/0+$/, "");
  const groupedWhole = BigInt(whole).toLocaleString("en-US");

  return trimmedFraction ? `${groupedWhole}.${trimmedFraction}` : `${groupedWhole}.00`;
};

export const BorrowPage = () => {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const [searchParams] = useSearchParams();

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

  const redemptionStatus = useMemo(
    () =>
      selectBorrowableRedemptions(
        redemptions,
        loansData as ContractRead<LoanSlot>[] | undefined,
        borrowConfigData as ContractRead<bigint>[] | undefined,
      ),
    [redemptions, loansData, borrowConfigData],
  );

  const availableRedemptions = redemptionStatus.available;

  // Auto-select redemption from URL parameter
  useEffect(() => {
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

  const { isBorrowEnabledForAsset } = useMaxBorrowPercentage(
    selectedRedemption?.depositToken,
    selectedRedemption?.facility,
  );

  const { annualInterestRatePercentage } = useAnnualInterestRate(
    selectedRedemption?.depositToken,
    selectedRedemption?.facility,
  );

  const { borrowAgainstRedemption, isPending, isSuccess, hash } = useBorrowAgainstRedemption();

  const originalRedemptionId = availableRedemptions[selectedRedemptionIndex]?.originalIndex;
  const {
    previewData,
    dueDateFormatted,
    isLoading: isLoadingPreview,
    error: previewError,
  } = usePreviewBorrow(userAddress, originalRedemptionId);

  const pendingBorrowRef = useRef<{ collateralAmount: string; borrowAmount: string } | null>(null);
  const trackedHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (isSuccess && hash && pendingBorrowRef.current && trackedHashRef.current !== hash) {
      trackedHashRef.current = hash;
      trackBorrowCreate({
        collateralAmount: pendingBorrowRef.current.collateralAmount,
        borrowAmount: pendingBorrowRef.current.borrowAmount,
        txHash: hash,
      });
      pendingBorrowRef.current = null;
    }
  }, [isSuccess, hash]);

  const redemptionTokens = useMemo(() => {
    return availableRedemptions.map(({ redemption, originalIndex }) => ({
      symbol: `cdUSDS-${formatTermSuffix(redemption.depositPeriod)}`,
      originalIndex,
    }));
  }, [availableRedemptions]);

  const selectedRedemptionToken = redemptionTokens[selectedRedemptionIndex] || redemptionTokens[0];

  const isBorrowValid = useMemo(() => {
    if (!userAddress) return { valid: false, reason: "Connect wallet to borrow" };
    if (availableRedemptions.length === 0)
      return { valid: false, reason: "No available redemptions" };
    if (!isBorrowEnabledForAsset)
      return { valid: false, reason: "Borrowing disabled for this asset" };
    if (isLoadingPreview) return { valid: false, reason: "Loading loan terms..." };
    if (previewError || !previewData) return { valid: false, reason: "Loan terms unavailable" };
    return { valid: true, reason: "" };
  }, [
    userAddress,
    availableRedemptions.length,
    isBorrowEnabledForAsset,
    isLoadingPreview,
    previewError,
    previewData,
  ]);

  const handleBorrow = () => {
    if (isBorrowValid.valid && selectedRedemption && previewData) {
      if (originalRedemptionId !== undefined) {
        pendingBorrowRef.current = {
          collateralAmount: formatEther(selectedRedemption.amount),
          borrowAmount: formatEther(previewData.principal),
        };
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
          <div className="flex flex-col items-center justify-center gap-4 py-12 min-h-[200px]">
            <RiExchangeFundsLine className="size-10 text-a10-b" />
            <p className="text-sm/5 font-semibold text-secondary-t text-center">
              {!isGlobalBorrowEnabled
                ? "Borrowing is currently disabled."
                : !redemptionStatus.hasFundedRedemptions
                  ? "You don't have any convertible deposit tokens to use as collateral."
                  : !redemptionStatus.hasNoActiveLoans
                    ? "All your redemptions already have active loans."
                    : "Borrowing is currently disabled for your available assets."}
            </p>
          </div>
        )}

        {/* Create position form */}
        {!isLoadingRedemptions && availableRedemptions.length > 0 && isGlobalBorrowEnabled && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form Inputs */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2 rounded-2xl border border-a3-b bg-surface-a3 p-4">
                <label htmlFor="redemption-slot" className="text-sm font-semibold">
                  Redemption
                </label>
                <div className="flex items-center gap-3">
                  <Icon name="cdUSDSIcon" className="size-5" />
                  {redemptionTokens.length > 1 ? (
                    <select
                      id="redemption-slot"
                      value={selectedRedemptionIndex}
                      onChange={(event) => setSelectedRedemptionIndex(Number(event.target.value))}
                      className="min-w-0 flex-1 rounded-full border border-a3-b bg-surface-a3 px-3 py-2 text-sm font-semibold text-primary-t"
                    >
                      {redemptionTokens.map((token, index) => (
                        <option key={token.originalIndex} value={index}>
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span id="redemption-slot" className="text-sm font-semibold">
                      {selectedRedemptionToken?.symbol}
                    </span>
                  )}
                </div>
                <span className="text-xs text-secondary-t">
                  The full redemption balance secures this loan.
                </span>
              </div>

              <Alert type="info">
                <RiInformationLine size={16} />
                <AlertDescription className="text-xs/4 font-semibold text-primary-t">
                  Borrowing uses the full redemption and the maximum available loan amount.
                </AlertDescription>
              </Alert>

              <Button
                type="button"
                size="md"
                className="w-full"
                disabled={!isBorrowValid.valid || isPending}
                title={!isBorrowValid.valid ? isBorrowValid.reason : undefined}
                onClick={handleBorrow}
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
                  <span className="text-xs font-normal text-secondary-t">Collateral</span>
                  <div className="flex items-center gap-1">
                    <Icon name="cdUSDSIcon" className="size-4" />
                    <span className="text-xs font-semibold">
                      {selectedRedemption ? formatAmount(selectedRedemption.amount) : "0.00"}{" "}
                      {selectedRedemptionToken?.symbol ?? "cdUSDS"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-a3-b py-2">
                  <span className="text-xs font-normal text-secondary-t">Principal</span>
                  <div className="flex items-center gap-1">
                    <Icon name="USDSColorTokenIcon" className="size-4" />
                    <span className="text-xs font-semibold">
                      {previewData ? formatAmount(previewData.principal) : "—"} USDS
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-a3-b py-2">
                  <span className="text-xs font-normal text-secondary-t">Borrow APY</span>
                  <span className="text-xs font-semibold">
                    {annualInterestRatePercentage.toFixed(2)}%
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-a3-b py-2">
                  <span className="text-xs font-normal text-secondary-t">Fixed Interest</span>
                  <span className="text-xs font-semibold">
                    {previewData ? formatAmount(previewData.interest) : "—"} USDS
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-a3-b py-2">
                  <span className="text-xs font-normal text-secondary-t">Total Repayment</span>
                  <span className="text-xs font-semibold">
                    {previewData ? formatAmount(previewData.principal + previewData.interest) : "—"}{" "}
                    USDS
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-normal text-secondary-t">Due Date</span>
                  <span className="text-xs font-semibold">{dueDateFormatted || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BorrowActiveLoans />
    </div>
  );
};
