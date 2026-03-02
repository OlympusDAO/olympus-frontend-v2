import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import USDSIcon from "@/assets/USDS.png";
import cdUSDSIcon from "@/assets/cdUSDS.png";
import { useAccount } from "wagmi";
import { useUserRedemptions } from "@/lib/hooks/cds/useUserRedemptions";
import { useReadContracts } from "wagmi";
import { useChainId } from "wagmi";
import DepositRedemptionVaultABI from "@/abis/DepositRedemptionVault";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { formatEther } from "viem";
import { formatTermSuffix } from "@/lib/utils";
import { useReceiptTokenName, useReceiptTokenId } from "@/lib/hooks/cds/useReceiptToken";
import { RepayLoanModal } from "./repay-loan-modal";
import { ExtendLoanModal } from "./extend-loan-modal";

type Loan = {
  initialPrincipal: bigint;
  principal: bigint;
  interest: bigint;
  dueDate: number;
  isDefaulted: boolean;
};

type LoanWithRedemption = {
  redemptionId: number;
  debt: string;
  debtUSD: string;
  principal: string;
  interest: string;
  collateral: string;
  collateralToken: string;
  collateralUSD: string;
  borrowAPY: string;
  depositToken: `0x${string}`;
  depositPeriod: number;
  facility: `0x${string}`;
  dueDate: number;
};

// Component to display dynamic token name
const LoanTokenName = ({
  asset,
  periodMonths,
  amount,
}: {
  asset: `0x${string}`;
  periodMonths: number;
  amount: string;
}) => {
  const { tokenId } = useReceiptTokenId(asset, periodMonths);
  const { tokenName } = useReceiptTokenName(tokenId);

  const displayName = tokenName || `cdUSDS-${formatTermSuffix(periodMonths)}`;

  return (
    <span>
      {amount} {displayName}
    </span>
  );
};

// Component to display circular progress for expiration
const ExpirationProgress = ({
  dueDate,
  depositPeriodMonths,
}: {
  dueDate: number;
  depositPeriodMonths: number;
}) => {
  const now = Math.floor(Date.now() / 1000);
  const dueDateTimestamp = dueDate;

  // Calculate days remaining
  const secondsRemaining = Math.max(0, dueDateTimestamp - now);
  const daysRemaining = Math.floor(secondsRemaining / (24 * 60 * 60));

  // Calculate total loan duration in days (depositPeriod months * 30 days)
  const totalDays = depositPeriodMonths * 30;

  // Calculate progress based on actual loan duration
  const progress = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));

  // Determine color based on progress
  const getColor = () => {
    if (progress < 50) return "text-green-500";
    if (progress < 75) return "text-yellow-500";
    return "text-red-500";
  };

  const getStrokeColor = () => {
    if (progress < 50) return "#22c55e"; // green
    if (progress < 75) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  const circumference = 2 * Math.PI * 16; // radius = 16
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10">
        <svg role="img" aria-label="Progress circle" className="w-10 h-10 transform -rotate-90">
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-surface-a5"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke={getStrokeColor()}
            strokeWidth="3"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        </svg>
      </div>
      <div>
        <div className={`font-medium ${getColor()}`}>{daysRemaining} days</div>
        <div className="text-xs text-secondary-t">
          {new Date(dueDateTimestamp * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>
    </div>
  );
};

export const ActiveLoans = () => {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const [selectedLoan, setSelectedLoan] = useState<number | null>(null);
  const [selectedLoanData, setSelectedLoanData] = useState<LoanWithRedemption | null>(null);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  // Fetch user redemptions
  const { redemptions, isLoading: isLoadingRedemptions } = useUserRedemptions(userAddress);

  const vaultAddress = getContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId);

  // Create contract calls for all redemption loans and interest rates
  const loanContracts = useMemo(() => {
    if (!userAddress || !vaultAddress || redemptions.length === 0) return [];

    return redemptions.flatMap((redemption, index) => [
      {
        address: vaultAddress,
        abi: DepositRedemptionVaultABI,
        functionName: "getRedemptionLoan" as const,
        args: [userAddress, index] as const,
      },
      {
        address: vaultAddress,
        abi: DepositRedemptionVaultABI,
        functionName: "getAnnualInterestRate" as const,
        args: [redemption.depositToken, redemption.facility] as const,
      },
    ]);
  }, [userAddress, vaultAddress, redemptions]);

  const { data: loanData, isLoading: isLoadingLoans } = useReadContracts({
    contracts: loanContracts,
  });

  // Process loans data
  const loansWithData: LoanWithRedemption[] = useMemo(() => {
    if (!loanData || redemptions.length === 0) return [];

    const loans: LoanWithRedemption[] = [];

    redemptions.forEach((redemption, index) => {
      const loanIndex = index * 2;
      const interestRateIndex = index * 2 + 1;

      const loanResult = loanData[loanIndex];
      const interestRateResult = loanData[interestRateIndex];

      if (loanResult?.status === "success" && interestRateResult?.status === "success") {
        // Type narrowing: we know loanResult is a Loan object (even index)
        // and interestRateResult is a bigint (odd index) based on our contract array structure
        const loan = loanResult.result as Loan;
        const interestRate = Number(interestRateResult.result as unknown as bigint);

        // Check if loan exists and has outstanding principal
        // dueDate > 0 means a loan was created
        // principal > 0 means the loan hasn't been fully repaid
        if (loan && loan.dueDate > 0 && loan.principal > 0) {
          const principalAmount = formatEther(loan.principal);
          const interestAmount = formatEther(loan.interest);
          const totalDebt = parseFloat(principalAmount) + parseFloat(interestAmount);
          const collateralAmount = formatEther(redemption.amount);

          loans.push({
            redemptionId: index,
            debt: totalDebt.toFixed(2),
            debtUSD: totalDebt.toFixed(2),
            principal: parseFloat(principalAmount).toFixed(2),
            interest: parseFloat(interestAmount).toFixed(2),
            collateral: parseFloat(collateralAmount).toFixed(2),
            collateralToken: `cdUSDS-${formatTermSuffix(redemption.depositPeriod)}`,
            collateralUSD: parseFloat(collateralAmount).toFixed(2),
            borrowAPY: (interestRate / 100).toFixed(2),
            depositToken: redemption.depositToken,
            depositPeriod: redemption.depositPeriod,
            facility: redemption.facility,
            dueDate: loan.dueDate,
          });
        }
      }
    });

    return loans;
  }, [loanData, redemptions]);

  const handleRepay = (loan: LoanWithRedemption) => {
    setSelectedLoan(loan.redemptionId);
    setSelectedLoanData(loan);
    setIsRepayModalOpen(true);
  };

  const handleExtend = (loan: LoanWithRedemption) => {
    setSelectedLoan(loan.redemptionId);
    setSelectedLoanData(loan);
    setIsExtendModalOpen(true);
  };

  const isLoading = isLoadingRedemptions || isLoadingLoans;

  return (
    <>
      <h2 className="text-xl font-semibold mb-3">Active Loans</h2>
      <Card className="p-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-secondary-t">Loading loans...</div>
        ) : loansWithData.length === 0 ? (
          <div className="text-center py-8 text-secondary-t">No active loans</div>
        ) : (
          <>
            {/* Mobile cards view */}
            <div className="block md:hidden space-y-4">
              {loansWithData.map((loan) => (
                <div
                  key={loan.redemptionId}
                  className="border border-a10-b rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tooltip
                        title={
                          <div className="text-xs">
                            <div>Principal: {loan.principal} USDS</div>
                            <div>Interest: {loan.interest} USDS</div>
                          </div>
                        }
                      >
                        <div className="flex items-center gap-2 cursor-help">
                          <img src={USDSIcon} alt="USDS" className="w-6 h-6" />
                          <div>
                            <div className="font-medium">{loan.debt} USDS</div>
                            <div className="text-xs text-secondary-t">${loan.debtUSD}</div>
                          </div>
                        </div>
                      </Tooltip>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-secondary-t">Debt</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={cdUSDSIcon} alt="cdUSDS" className="w-6 h-6" />
                      <div>
                        <div className="font-medium">
                          <LoanTokenName
                            asset={loan.depositToken}
                            periodMonths={loan.depositPeriod}
                            amount={loan.collateral}
                          />
                        </div>
                        <div className="text-xs text-secondary-t">${loan.collateralUSD}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-secondary-t">Collateral</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-a5-b">
                    <div>
                      <div className="text-sm text-secondary-t mb-1">Expires</div>
                      <ExpirationProgress
                        dueDate={loan.dueDate}
                        depositPeriodMonths={loan.depositPeriod}
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-secondary-t">Borrow APY</div>
                      <div className="font-medium">{loan.borrowAPY}%</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleExtend(loan)}
                    >
                      Extend
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => handleRepay(loan)}>
                      Repay
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <Table className="hidden md:table">
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="border-b-0">
                  <TableHead className="text-secondary-t font-normal">Debt</TableHead>
                  <TableHead className="text-secondary-t font-normal">Collateral</TableHead>
                  <TableHead className="text-secondary-t font-normal">Expires</TableHead>
                  <TableHead className="text-secondary-t font-normal">Borrow APY</TableHead>
                  <TableHead className="text-secondary-t font-normal text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loansWithData.map((loan) => (
                  <TableRow key={loan.redemptionId} className="border-b-0">
                    <TableCell className="py-4">
                      <Tooltip
                        title={
                          <div className="text-xs">
                            <div>Principal: {loan.principal} USDS</div>
                            <div>Interest: {loan.interest} USDS</div>
                          </div>
                        }
                      >
                        <div className="flex items-center gap-3 border rounded-full p-[6px] border-a10-b pr-4 min-w-0 max-w-[200px] cursor-help">
                          <img src={USDSIcon} alt="USDS" className="w-8 h-8 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                              {loan.debt} USDS
                            </div>
                            <div className="text-sm text-secondary-t whitespace-nowrap overflow-hidden text-ellipsis">
                              ${loan.debtUSD}
                            </div>
                          </div>
                        </div>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3 border rounded-full p-[6px] border-a10-b pr-4 min-w-0 max-w-[200px]">
                        <img src={cdUSDSIcon} alt="cdUSDS" className="w-8 h-8 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                            <LoanTokenName
                              asset={loan.depositToken}
                              periodMonths={loan.depositPeriod}
                              amount={loan.collateral}
                            />
                          </div>
                          <div className="text-sm text-secondary-t whitespace-nowrap overflow-hidden text-ellipsis">
                            ${loan.collateralUSD}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <ExpirationProgress
                        dueDate={loan.dueDate}
                        depositPeriodMonths={loan.depositPeriod}
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="font-medium">{loan.borrowAPY}%</span>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleExtend(loan)}>
                          Extend
                        </Button>
                        <Button size="sm" onClick={() => handleRepay(loan)}>
                          Repay
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Card>

      <RepayLoanModal
        isOpen={isRepayModalOpen}
        onClose={() => {
          setIsRepayModalOpen(false);
          setSelectedLoan(null);
          setSelectedLoanData(null);
        }}
        redemptionId={selectedLoan}
        collateralAmount={selectedLoanData?.collateral || "0"}
        collateralToken={selectedLoanData?.collateralToken || "cdUSDS"}
      />

      <ExtendLoanModal
        isOpen={isExtendModalOpen}
        onClose={() => {
          setIsExtendModalOpen(false);
          setSelectedLoan(null);
          setSelectedLoanData(null);
        }}
        redemptionId={selectedLoan}
        collateralAmount={selectedLoanData?.collateral || "0"}
        collateralToken={selectedLoanData?.collateralToken || "cdUSDS"}
        principal={selectedLoanData?.principal || "0"}
        interest={selectedLoanData?.interest || "0"}
      />
    </>
  );
};
