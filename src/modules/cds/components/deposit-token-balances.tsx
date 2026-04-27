import type React from "react";
import { useState } from "react";
import { useAccount, useReadContracts, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Icon } from "@/components/icon";
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

// ─── Token pill ───────────────────────────────────────────────────────────────

const TokenPill = ({ name, amount }: { name: string; amount: string }) => (
  <div className="border border-a10-b rounded-full pl-1.5 pr-4 py-1.5 flex items-center gap-2 w-fit">
    <Icon name="cdUSDSIcon" size={32} className="text-a10-b shrink-0" />
    <div className="flex flex-col">
      <span className="text-xs font-semibold">
        {amount} {name}
      </span>
      <span className="text-xs font-normal text-secondary-t">${amount}</span>
    </div>
  </div>
);

export const DepositTokenBalances: React.FC = () => {
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

  const {
    unwrappedBalances,
    wrappedBalances,
    totalPositionCount,
    isLoading: isLoadingBalances,
  } = useReceiptTokenBalances(userAddress);
  const { pendingRedemptions, isLoading: isLoadingRedemptions } = usePendingRedemptions();

  const vaultAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

  const { data: loansData } = useReadContracts({
    contracts: pendingRedemptions.map((redemption) => ({
      address: vaultAddress,
      abi: DepositRedemptionVaultABI,
      functionName: "getRedemptionLoan",
      args: [userAddress, redemption.redemptionId],
    })),
    query: { enabled: !!(pendingRedemptions.length > 0 && vaultAddress && userAddress) },
  });

  const { data: borrowConfigData } = useReadContracts({
    contracts: pendingRedemptions.map((redemption) => ({
      address: vaultAddress,
      abi: DepositRedemptionVaultABI,
      functionName: "getMaxBorrowPercentage",
      args: [redemption.asset as `0x${string}`, redemption.facility],
    })),
    query: { enabled: !!(pendingRedemptions.length > 0 && vaultAddress) },
  });

  const isBorrowEnabled = (index: number) => {
    if (!borrowConfigData?.[index]) return false;
    const result = borrowConfigData[index];
    if (result.status !== "success" || result.result === undefined) return false;
    return Number(result.result) > 0;
  };

  const hasActiveLoan = (index: number) => {
    if (!loansData?.[index]) return false;
    const loanResult = loansData[index];
    if (loanResult.status !== "success" || !loanResult.result) return false;
    const loan = loanResult.result as { principal: bigint; dueDate: number };
    return loan.principal > 0n;
  };

  const isRedemptionRedeemable = (redeemableAt: number) =>
    redeemableAt <= Math.floor(Date.now() / 1000);

  const isEmpty =
    unwrappedBalances.length === 0 &&
    wrappedBalances.length === 0 &&
    pendingRedemptions.length === 0;

  // ─── Loading / Empty state ─────────────────────────────────────────────────

  if (isLoadingBalances || isLoadingRedemptions || isEmpty) {
    return (
      <>
        <h2 className="text-xl font-semibold mb-3">Token Balances</h2>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="py-12 text-center text-sm text-tertiary-t">
                {isLoadingBalances || isLoadingRedemptions ? (
                  "Loading balances..."
                ) : totalPositionCount > 0 ? (
                  <>
                    No receipt tokens
                    <p className="text-xs mt-1 text-tertiary-t">
                      You have {totalPositionCount} position(s) but no receipt tokens
                    </p>
                  </>
                ) : (
                  "No token balances"
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-3">Token Balances</h2>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Unwrapped balances */}
            {unwrappedBalances.map((balance) => (
              <TableRow key={`${balance.asset}-${balance.periodMonths}`}>
                <TableCell>
                  <TokenPill
                    name={balance.displayName}
                    amount={formatTokenBalance(balance.totalBalance)}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="filled" color="green" size="sm">
                    Active
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedTokenBalance(balance);
                        setIsRedeemModalOpen(true);
                      }}
                    >
                      Redeem
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedUnwrappedBalance(balance);
                        setIsWrapModalOpen(true);
                      }}
                    >
                      Wrap
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {/* Wrapped balances */}
            {wrappedBalances.map((balance) => (
              <TableRow key={`wrapped-${balance.tokenId}`}>
                <TableCell>
                  <TokenPill
                    name={balance.displayName}
                    amount={formatTokenBalance(balance.wrappedBalance ?? 0n)}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="filled" color="blue" size="sm">
                    Wrapped
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedWrappedBalance(balance);
                        setIsUnwrapModalOpen(true);
                      }}
                    >
                      Unwrap
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {/* Pending redemptions */}
            {pendingRedemptions.map((redemption, index) => {
              const isRedeemable = isRedemptionRedeemable(redemption.redeemableAt);
              return (
                <TableRow key={`pending-${redemption.redemptionId}`}>
                  <TableCell>
                    <TokenPill
                      name={redemption.displayName}
                      amount={formatPendingAmount(redemption.amount)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex w-fit flex-col gap-1.5">
                      <Badge variant="filled" color={isRedeemable ? "green" : "orange"} size="sm">
                        {formatRedemptionStatus(redemption.redeemableAt)}
                      </Badge>
                      {!isRedeemable && (
                        <Progress
                          value={calculateRedemptionProgress(
                            redemption.redeemableAt,
                            redemption.periodMonths,
                          )}
                          className="h-1 w-full"
                          indicatorClassName="bg-orange"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {isRedeemable ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRedeemableRedemption(redemption);
                            setIsFinishRedemptionModalOpen(true);
                          }}
                        >
                          Complete
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedPendingRedemption(redemption);
                            setIsCancelRedemptionModalOpen(true);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      {!isRedeemable && !hasActiveLoan(index) && isBorrowEnabled(index) && (
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
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {unwrappedBalances.map((balance) => (
          <div
            key={`${balance.asset}-${balance.periodMonths}`}
            className="border border-a5-b rounded-2xl p-4 space-y-3"
          >
            <TokenPill
              name={balance.displayName}
              amount={formatTokenBalance(balance.totalBalance)}
            />
            <Badge variant="filled" color="green" size="sm">
              Active
            </Badge>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setSelectedTokenBalance(balance);
                  setIsRedeemModalOpen(true);
                }}
              >
                Redeem
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setSelectedUnwrappedBalance(balance);
                  setIsWrapModalOpen(true);
                }}
              >
                Wrap
              </Button>
            </div>
          </div>
        ))}

        {wrappedBalances.map((balance) => (
          <div
            key={`wrapped-${balance.tokenId}`}
            className="border border-a5-b rounded-2xl p-4 space-y-3"
          >
            <TokenPill
              name={balance.displayName}
              amount={formatTokenBalance(balance.wrappedBalance ?? 0n)}
            />
            <Badge variant="filled" color="blue" size="sm">
              Wrapped
            </Badge>
            <div className="pt-1">
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setSelectedWrappedBalance(balance);
                  setIsUnwrapModalOpen(true);
                }}
              >
                Unwrap
              </Button>
            </div>
          </div>
        ))}

        {pendingRedemptions.map((redemption, index) => {
          const isRedeemable = isRedemptionRedeemable(redemption.redeemableAt);
          return (
            <div
              key={`pending-${redemption.redemptionId}`}
              className="border border-a5-b rounded-2xl p-4 space-y-3"
            >
              <TokenPill
                name={redemption.displayName}
                amount={formatPendingAmount(redemption.amount)}
              />
              <div className="flex flex-col gap-1.5">
                <Badge variant="filled" color={isRedeemable ? "green" : "orange"} size="sm">
                  {formatRedemptionStatus(redemption.redeemableAt)}
                </Badge>
                {!isRedeemable && (
                  <Progress
                    value={calculateRedemptionProgress(
                      redemption.redeemableAt,
                      redemption.periodMonths,
                    )}
                    className="h-1"
                    indicatorClassName="bg-orange"
                  />
                )}
              </div>
              <div className="flex gap-2 pt-1">
                {isRedeemable ? (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedRedeemableRedemption(redemption);
                      setIsFinishRedemptionModalOpen(true);
                    }}
                  >
                    Complete
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setSelectedPendingRedemption(redemption);
                      setIsCancelRedemptionModalOpen(true);
                    }}
                  >
                    Cancel
                  </Button>
                )}
                {!isRedeemable && !hasActiveLoan(index) && isBorrowEnabled(index) && (
                  <Link to={`/borrow?redemptionId=${redemption.redemptionId}`} className="flex-1">
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

      {/* Modals */}
      {isRedeemModalOpen && (
        <RedeemModal
          isOpen
          onClose={() => {
            setIsRedeemModalOpen(false);
            setSelectedTokenBalance(undefined);
          }}
          tokenBalance={selectedTokenBalance}
        />
      )}
      {isCancelRedemptionModalOpen && (
        <CancelRedemptionModal
          isOpen
          onClose={() => {
            setIsCancelRedemptionModalOpen(false);
            setSelectedPendingRedemption(undefined);
          }}
          pendingRedemption={selectedPendingRedemption}
        />
      )}
      {isFinishRedemptionModalOpen && (
        <FinishRedemptionModal
          isOpen
          onClose={() => {
            setIsFinishRedemptionModalOpen(false);
            setSelectedRedeemableRedemption(undefined);
          }}
          pendingRedemption={selectedRedeemableRedemption}
        />
      )}
      {isUnwrapModalOpen && (
        <UnwrapReceiptTokenModal
          isOpen
          onClose={() => {
            setIsUnwrapModalOpen(false);
            setSelectedWrappedBalance(undefined);
          }}
          wrappedBalance={selectedWrappedBalance}
        />
      )}
      {isWrapModalOpen && (
        <WrapReceiptTokenModal
          isOpen
          onClose={() => {
            setIsWrapModalOpen(false);
            setSelectedUnwrappedBalance(undefined);
          }}
          unwrappedBalance={selectedUnwrappedBalance}
        />
      )}
    </>
  );
};
