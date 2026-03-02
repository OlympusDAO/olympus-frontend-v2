import type React from "react";
import { useState } from "react";
import { useAccount, useReadContracts, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useReceiptTokenBalances,
  formatTokenBalance,
} from "@/lib/hooks/cds/useReceiptTokenBalances";
import { usePendingRedemptions, formatPendingAmount } from "@/lib/hooks/cds/usePendingRedemptions";
import { formatRedemptionStatus, calculateRedemptionProgress } from "@/lib/utils/timeUtils";
import cdUSDSIcon from "@/assets/cdUSDS.png";
import { RedeemModal } from "@/components/redeem-modal";
import { CancelRedemptionModal } from "@/components/cancel-redemption-modal";
import { FinishRedemptionModal } from "@/components/finish-redemption-modal";
import { UnwrapReceiptTokenModal } from "@/components/unwrap-receipt-token-modal";
import { WrapReceiptTokenModal } from "@/components/wrap-receipt-token-modal";
import { Link } from "react-router-dom";
import { getContractAddress, ContractName } from "@/lib/contracts";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";

interface TokenBalance {
  asset: string;
  periodMonths: number;
  totalBalance: bigint;
  wrappedBalance?: bigint;
  displayName: string;
  tokenId: bigint;
  wrappedTokenAddress: string;
  isWrapped: boolean;
}

interface PendingRedemption {
  redemptionId: number;
  asset: string;
  periodMonths: number;
  amount: bigint;
  displayName: string;
  redeemableAt: number;
  facility: `0x${string}`;
}

export const TokenBalances: React.FC = () => {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [selectedTokenBalance, setSelectedTokenBalance] = useState<TokenBalance | undefined>(
    undefined,
  );
  const [isCancelRedemptionModalOpen, setIsCancelRedemptionModalOpen] = useState(false);
  const [selectedPendingRedemption, setSelectedPendingRedemption] = useState<
    PendingRedemption | undefined
  >(undefined);
  const [isFinishRedemptionModalOpen, setIsFinishRedemptionModalOpen] = useState(false);
  const [selectedRedeemableRedemption, setSelectedRedeemableRedemption] = useState<
    PendingRedemption | undefined
  >(undefined);
  const [isUnwrapModalOpen, setIsUnwrapModalOpen] = useState(false);
  const [selectedWrappedBalance, setSelectedWrappedBalance] = useState<TokenBalance | undefined>(
    undefined,
  );
  const [isWrapModalOpen, setIsWrapModalOpen] = useState(false);
  const [selectedUnwrappedBalance, setSelectedUnwrappedBalance] = useState<
    TokenBalance | undefined
  >(undefined);

  // Get token balances
  const {
    unwrappedBalances,
    wrappedBalances,
    totalPositionCount,
    isLoading: isLoadingBalances,
  } = useReceiptTokenBalances(userAddress);

  // Get pending redemptions
  const { pendingRedemptions, isLoading: isLoadingRedemptions } = usePendingRedemptions();

  // Get vault address
  const vaultAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

  // Fetch loan data for all pending redemptions
  const { data: loansData } = useReadContracts({
    contracts: pendingRedemptions.map((redemption) => ({
      address: vaultAddress,
      abi: DepositRedemptionVaultABI,
      functionName: "getRedemptionLoan",
      args: [userAddress, redemption.redemptionId],
    })),
    query: {
      enabled: !!(pendingRedemptions.length > 0 && vaultAddress && userAddress),
    },
  });

  // Fetch max borrow percentage for all pending redemptions
  const { data: borrowConfigData } = useReadContracts({
    contracts: pendingRedemptions.map((redemption) => ({
      address: vaultAddress,
      abi: DepositRedemptionVaultABI,
      functionName: "getMaxBorrowPercentage",
      args: [redemption.asset as `0x${string}`, redemption.facility],
    })),
    query: {
      enabled: !!(pendingRedemptions.length > 0 && vaultAddress),
    },
  });

  // Helper to check if borrowing is enabled for a redemption
  const isBorrowEnabled = (index: number) => {
    if (!borrowConfigData || !borrowConfigData[index]) return false;
    const result = borrowConfigData[index];
    if (result.status !== "success" || result.result === undefined) return false;
    return Number(result.result) > 0;
  };

  // Helper to check if redemption has active loan
  const hasActiveLoan = (redemptionIndex: number) => {
    if (!loansData || !loansData[redemptionIndex]) return false;
    const loanResult = loansData[redemptionIndex];
    if (loanResult.status !== "success" || !loanResult.result) return false;
    const loan = loanResult.result as { principal: bigint; dueDate: number };
    return loan.principal > 0n;
  };

  const handleRedeem = (tokenBalance: TokenBalance) => {
    setSelectedTokenBalance(tokenBalance);
    setIsRedeemModalOpen(true);
  };

  const handleCloseRedeemModal = () => {
    setIsRedeemModalOpen(false);
    setSelectedTokenBalance(undefined);
  };

  const handleCancelRedemption = (redemption: PendingRedemption) => {
    setSelectedPendingRedemption(redemption);
    setIsCancelRedemptionModalOpen(true);
  };

  const handleCloseCancelRedemptionModal = () => {
    setIsCancelRedemptionModalOpen(false);
    setSelectedPendingRedemption(undefined);
  };

  const handleFinishRedemption = (redemption: PendingRedemption) => {
    setSelectedRedeemableRedemption(redemption);
    setIsFinishRedemptionModalOpen(true);
  };

  const handleCloseFinishRedemptionModal = () => {
    setIsFinishRedemptionModalOpen(false);
    setSelectedRedeemableRedemption(undefined);
  };

  const handleUnwrap = (balance: TokenBalance) => {
    setSelectedWrappedBalance(balance);
    setIsUnwrapModalOpen(true);
  };

  const handleCloseUnwrapModal = () => {
    setIsUnwrapModalOpen(false);
    setSelectedWrappedBalance(undefined);
  };

  const handleWrap = (balance: TokenBalance) => {
    setSelectedUnwrappedBalance(balance);
    setIsWrapModalOpen(true);
  };

  const handleCloseWrapModal = () => {
    setIsWrapModalOpen(false);
    setSelectedUnwrappedBalance(undefined);
  };

  const isRedemptionRedeemable = (redeemableAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    return redeemableAt <= now;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Token Balances</h2>
      </div>

      <Card className="p-6 space-y-4">
        {isLoadingBalances || isLoadingRedemptions ? (
          <div className="text-center py-8 text-secondary-t">Loading balances...</div>
        ) : unwrappedBalances.length === 0 &&
          wrappedBalances.length === 0 &&
          pendingRedemptions.length === 0 ? (
          <div className="text-center py-8 text-secondary-t">
            No token balances
            {totalPositionCount > 0 && (
              <div className="text-xs mt-1">
                You have {totalPositionCount} position(s) but no receipt tokens
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Mobile cards view */}
            <div className="block md:hidden space-y-4">
              {/* Unwrapped token balances */}
              {unwrappedBalances.map((balance) => (
                <div
                  key={`${balance.asset}-${balance.periodMonths}`}
                  className="bg-gray-50 dark:bg-surface-bg-l1 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <img src={cdUSDSIcon} alt="cdUSDS" className="w-8 h-8" />
                    <div>
                      <div className="font-medium">
                        {formatTokenBalance(balance.totalBalance)} {balance.displayName}
                      </div>
                      <div className="text-sm text-secondary-t">
                        ${formatTokenBalance(balance.totalBalance)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div>
                      <span className="text-secondary-t">Status:</span>
                      <div className="mt-1">
                        <Badge className="bg-green/20 text-green rounded-full px-3 py-1">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1" onClick={() => handleRedeem(balance)}>
                      Redeem
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleWrap(balance)}
                    >
                      Wrap
                    </Button>
                  </div>
                </div>
              ))}

              {/* Wrapped token balances */}
              {wrappedBalances.map((balance) => (
                <div
                  key={`wrapped-${balance.tokenId}`}
                  className="bg-gray-50 dark:bg-surface-bg-l1 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <img src={cdUSDSIcon} alt="cdUSDS" className="w-8 h-8" />
                    <div>
                      <div className="font-medium">
                        {formatTokenBalance(balance.wrappedBalance || 0n)} {balance.displayName}
                      </div>
                      <div className="text-sm text-secondary-t">
                        ${formatTokenBalance(balance.wrappedBalance || 0n)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div>
                      <span className="text-secondary-t">Status:</span>
                      <div className="mt-1">
                        <Badge className="bg-blue/20 text-blue rounded-full px-3 py-1">
                          Wrapped
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1" onClick={() => handleUnwrap(balance)}>
                      Unwrap
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pending redemptions */}
              {pendingRedemptions.map((redemption) => {
                const isRedeemable = isRedemptionRedeemable(redemption.redeemableAt);
                return (
                  <div
                    key={`pending-${redemption.redemptionId}`}
                    className="rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <img src={cdUSDSIcon} alt="cdUSDS" className="w-8 h-8" />
                      <div>
                        <div className="font-medium">
                          {formatPendingAmount(redemption.amount)} {redemption.displayName}
                        </div>
                        <div className="text-sm text-secondary-t">
                          ${formatPendingAmount(redemption.amount)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-secondary-t">Status:</span>
                        <div
                          className={`mt-1 font-medium ${isRedeemable ? "text-green" : "text-yellow"}`}
                        >
                          {formatRedemptionStatus(redemption.redeemableAt)}
                        </div>
                        <div className="mt-2">
                          <Progress
                            value={calculateRedemptionProgress(
                              redemption.redeemableAt,
                              redemption.periodMonths,
                            )}
                            className="h-1 bg-orange-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {isRedeemable ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleFinishRedemption(redemption)}
                        >
                          Complete Redemption
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCancelRedemption(redemption)}
                        >
                          Cancel
                        </Button>
                      )}
                      {!isRedeemable &&
                        !hasActiveLoan(pendingRedemptions.indexOf(redemption)) &&
                        isBorrowEnabled(pendingRedemptions.indexOf(redemption)) && (
                          <Link
                            to={`/borrow?redemptionId=${redemption.redemptionId}`}
                            className="flex-1"
                          >
                            <Button size="sm" variant="secondary" className="w-full">
                              Borrow
                            </Button>
                          </Link>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Desktop table view */}
        {!isLoadingBalances &&
          !isLoadingRedemptions &&
          (unwrappedBalances.length > 0 ||
            wrappedBalances.length > 0 ||
            pendingRedemptions.length > 0) && (
            <Table className="hidden md:table">
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="border-b-0">
                  <TableHead className="text-secondary-t font-normal">Balance</TableHead>
                  <TableHead className="text-secondary-t font-normal">Status</TableHead>
                  <TableHead className="text-secondary-t font-normal text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Unwrapped token balances */}
                {unwrappedBalances.map((balance) => (
                  <TableRow key={`${balance.displayName}`} className="border-b-0">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <img src={cdUSDSIcon} alt="cdUSDS" className="w-8 h-8" />
                        <div>
                          <div className="font-medium">
                            {formatTokenBalance(balance.totalBalance)} {balance.displayName}
                          </div>
                          <div className="text-sm text-secondary-t">
                            ${formatTokenBalance(balance.totalBalance)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className="bg-green/20 text-green rounded-full px-3 py-1">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => handleRedeem(balance)}>
                          Redeem
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleWrap(balance)}>
                          Wrap
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Wrapped token balances */}
                {wrappedBalances.map((balance) => (
                  <TableRow key={`wrapped-${balance.tokenId}`} className="border-b-0">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <img src={cdUSDSIcon} alt="cdUSDS" className="w-8 h-8" />
                        <div>
                          <div className="font-medium">
                            {formatTokenBalance(balance.wrappedBalance || 0n)} {balance.displayName}
                          </div>
                          <div className="text-sm text-secondary-t">
                            ${formatTokenBalance(balance.wrappedBalance || 0n)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className="bg-blue/20 text-blue rounded-full px-3 py-1">Wrapped</Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <Button size="sm" onClick={() => handleUnwrap(balance)}>
                        Unwrap
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Pending redemptions */}
                {pendingRedemptions.map((redemption) => {
                  const isRedeemable = isRedemptionRedeemable(redemption.redeemableAt);
                  return (
                    <TableRow key={`pending-${redemption.redemptionId}`} className="border-b-0">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <img src={cdUSDSIcon} alt="cdUSDS" className="w-8 h-8" />
                          <div>
                            <div className="font-medium">
                              {formatPendingAmount(redemption.amount)} {redemption.displayName}
                            </div>
                            <div className="text-sm text-secondary-t">
                              ${formatPendingAmount(redemption.amount)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-2">
                          <Badge
                            className={`${isRedeemable ? "bg-green/20 text-green" : "bg-yellow/20 text-yellow"} rounded-full px-3 py-1`}
                          >
                            {formatRedemptionStatus(redemption.redeemableAt)}
                          </Badge>
                          <Progress
                            value={calculateRedemptionProgress(
                              redemption.redeemableAt,
                              redemption.periodMonths,
                            )}
                            className="h-1 w-full bg-surface-a10"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {isRedeemable ? (
                            <Button size="sm" onClick={() => handleFinishRedemption(redemption)}>
                              Complete Redemption
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => handleCancelRedemption(redemption)}>
                              Cancel
                            </Button>
                          )}
                          {!isRedeemable &&
                            !hasActiveLoan(pendingRedemptions.indexOf(redemption)) &&
                            isBorrowEnabled(pendingRedemptions.indexOf(redemption)) && (
                              <Link to={`/borrow?redemptionId=${redemption.redemptionId}`}>
                                <Button size="sm" variant="secondary">
                                  Borrow
                                </Button>
                              </Link>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
      </Card>

      {isRedeemModalOpen && (
        <RedeemModal
          isOpen={isRedeemModalOpen}
          onClose={handleCloseRedeemModal}
          tokenBalance={selectedTokenBalance}
        />
      )}

      {isCancelRedemptionModalOpen && (
        <CancelRedemptionModal
          isOpen={isCancelRedemptionModalOpen}
          onClose={handleCloseCancelRedemptionModal}
          pendingRedemption={selectedPendingRedemption}
        />
      )}

      {isFinishRedemptionModalOpen && (
        <FinishRedemptionModal
          isOpen={isFinishRedemptionModalOpen}
          onClose={handleCloseFinishRedemptionModal}
          pendingRedemption={selectedRedeemableRedemption}
        />
      )}

      {isUnwrapModalOpen && (
        <UnwrapReceiptTokenModal
          isOpen={isUnwrapModalOpen}
          onClose={handleCloseUnwrapModal}
          wrappedBalance={selectedWrappedBalance}
        />
      )}

      {isWrapModalOpen && (
        <WrapReceiptTokenModal
          isOpen={isWrapModalOpen}
          onClose={handleCloseWrapModal}
          unwrappedBalance={selectedUnwrappedBalance}
        />
      )}
    </>
  );
};
