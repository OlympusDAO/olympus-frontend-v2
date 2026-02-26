import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckIcon, ExternalLink, CheckCircle2 } from "lucide-react";
import cdUSDSIcon from "@/assets/cdUSDS.png";
import USDSIcon from "@/assets/USDS.png";
import { formatEther, parseEther } from "viem";
import { useAccount, useChainId } from "wagmi";
import { Link } from "react-router-dom";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { ContractName, requireContractAddress } from "@/lib/contracts";
import { useRedemptionLoan } from "@/lib/hooks/cds/useRedemptionLoan";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import { getTokenAddress } from "@/lib/tokens";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useRepayLoan } from "@/lib/hooks/cds/useRepayLoan";

interface RepayLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  redemptionId: number | null;
  collateralAmount: string;
  collateralToken: string;
}

const formatTxHash = (hash: string) => {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

export const RepayLoanModal: React.FC<RepayLoanModalProps> = ({
  isOpen,
  onClose,
  redemptionId,
  collateralAmount,
  collateralToken,
}) => {
  const [repayAmount, setRepayAmount] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  // Fetch loan data
  const { loanData, refetch: refetchLoan } = useRedemptionLoan(
    userAddress,
    redemptionId ?? undefined
  );

  // Get USDS token address and balance
  const usdsTokenAddress = getTokenAddress("USDS", chainId);
  const { balance: usdsBalance } = useTokenBalance(usdsTokenAddress, userAddress);

  // Get the target contract address for approval (DepositRedemptionVault)
  const targetContractAddress = chainId
    ? requireContractAddress(ContractName.DEPOSIT_REDEMPTION_VAULT, chainId)
    : undefined;

  // Token approval hooks
  const { allowance, refetch: refetchAllowance, queryKey } = useTokenAllowance(
    usdsTokenAddress!,
    userAddress,
    targetContractAddress
  );

  const {
    approve,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
    reset: resetApproval,
  } = useTokenApproval();

  // Repay loan hook
  const {
    repayLoan,
    isPending: isRepaying,
    isSuccess: isRepaySuccess,
    hash: repayHash,
    reset: resetRepay,
  } = useRepayLoan();

  // Calculate total debt
  const totalDebt = useMemo(() => {
    if (!loanData) return "0";
    const principal = parseFloat(formatEther(loanData.principal));
    const interest = parseFloat(formatEther(loanData.interest));
    return (principal + interest).toFixed(2);
  }, [loanData]);

  // Check if approval is needed
  const needsApproval = useMemo(() => {
    if (!repayAmount || repayAmount === "0" || !allowance || !loanData) return false;
    try {
      const repayAmountBigInt = parseEther(repayAmount);
      // Need to approve for repayment amount + slippage buffer (0.1% of principal)
      const maxSlippage = loanData.principal * 10n / 10000n;
      const requiredAllowance = repayAmountBigInt + maxSlippage;
      return allowance < requiredAllowance;
    } catch {
      return false;
    }
  }, [repayAmount, allowance, loanData]);

  // Determine current step
  const currentStep = useMemo(() => {
    if (isRepaySuccess) return 3;
    if (!needsApproval || approvalSuccess) return 2;
    return 1;
  }, [approvalSuccess, needsApproval, isRepaySuccess]);

  // Validation
  const isValidAmount = useMemo(() => {
    if (!repayAmount || repayAmount === "0") return false;
    try {
      const amount = parseFloat(repayAmount);
      const total = parseFloat(totalDebt);
      const balance = usdsBalance ? parseFloat(formatEther(usdsBalance)) : 0;
      return amount > 0 && amount <= total && amount <= balance;
    } catch {
      return false;
    }
  }, [repayAmount, totalDebt, usdsBalance]);

  // Handlers
  const handleApprove = async () => {
    if (!repayAmount || !usdsTokenAddress || !targetContractAddress || !loanData) return;
    try {
      const amount = parseEther(repayAmount);
      // Approve for the repayment amount plus slippage buffer (0.1% of principal)
      const maxSlippage = loanData.principal * 10n / 10000n;
      const approvalAmount = amount + maxSlippage;
      approve({
        tokenAddress: usdsTokenAddress,
        spender: targetContractAddress,
        amount: approvalAmount,
        queryKey,
      });
      await refetchAllowance();
    } catch (error) {
      console.error("Approval failed:", error);
    }
  };

  const handleRepay = async () => {
    if (!repayAmount || redemptionId === null || !loanData) return;
    try {
      const amount = parseEther(repayAmount);
      // Allow for up to 0.1% overpayment due to rounding in asset->share conversion
      // This is checked against the principal portion only, not the total payment
      // Using percentage instead of fixed amount to handle varying loan sizes
      const maxSlippage = loanData.principal * 10n / 10000n;

      repayLoan({
        redemptionId,
        amount,
        maxSlippage,
      });
    } catch (error) {
      console.error("Repayment failed:", error);
    }
  };

  // Calculate the max amount user can actually repay (lesser of debt or balance)
  const maxRepayableAmount = useMemo(() => {
    const debt = parseFloat(totalDebt);
    const balance = usdsBalance ? parseFloat(formatEther(usdsBalance)) : 0;
    return Math.min(debt, balance).toFixed(2);
  }, [totalDebt, usdsBalance]);

  const handleMaxClick = () => {
    setRepayAmount(maxRepayableAmount);
  };

  const handleStartRepay = () => {
    if (!isValidAmount) return;
    setShowSteps(true);
    if (!needsApproval) {
      // If no approval needed, skip to repay
      handleRepay();
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setRepayAmount("");
      setShowSteps(false);
      resetApproval();
      resetRepay();
      if (redemptionId !== null) {
        refetchLoan();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, redemptionId]);

  // Steps configuration
  const steps = [
    {
      number: 1,
      title: "Approve USDS",
      detail: `$${parseFloat(repayAmount || "0").toFixed(2)}`,
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
      isLoading: currentStep === 1 && isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    },
    {
      number: 2,
      title: "Repay Loan",
      detail: `-${parseFloat(repayAmount || "0").toFixed(2)} USDS`,
      icon: USDSIcon,
      isActive: currentStep === 2,
      isCompleted: isRepaySuccess,
      isLoading: currentStep === 2 && isRepaying,
      hash: isRepaySuccess ? repayHash : undefined,
    },
  ];

  // Steps view
  if (showSteps) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 text-center">
            {isRepaySuccess ? (
              <div className="w-full mx-auto items-center justify-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green" />
                </div>
                <p className="text-xl font-semibold mb-2 text-center">
                  Congrats, all done!
                </p>
                <p className="text-sm text-secondary-t text-center">
                  Your loan has been repaid successfully.
                </p>
              </div>
            ) : (
              <>
                <DialogTitle className="text-xl">Repay Loan</DialogTitle>
                <p className="text-sm text-secondary-t font-light">
                  Step {currentStep}/2. Proceed with your wallet.
                </p>
              </>
            )}
          </DialogHeader>

          <div className="px-6 pb-6">
            {/* Steps UI */}
            <div className="bg-surface-a3 border border-a3-b rounded-3xl">
              {steps.map((step, index) => (
                <div key={step.number}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full ring-3 flex items-center justify-center text-sm font-medium ${
                          step.isCompleted
                            ? "text-green"
                            : step.isActive
                            ? "text-primary-t"
                            : "text-secondary-t ring-a10-b"
                        }`}
                      >
                        {step.isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : step.isCompleted ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          step.number
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{step.title}</div>
                        {step.detail && (
                          <div className="text-xs text-secondary-t rounded-full border px-2 py-1 text-center border-a10-b inline-block mt-1">
                            {step.detail}
                          </div>
                        )}
                        {step.isCompleted && step.hash && (
                          <Link
                            target="_blank"
                            to={`${blockExplorerTxBaseUrl}/${step.hash}`}
                            className="flex items-center gap-1 text-xs text-blue hover:text-blue-800 mt-1"
                          >
                            {formatTxHash(step.hash)}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {step.icon && (
                        <img src={step.icon} alt="" className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="border-b border-a5-b mx-4" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              {isRepaySuccess ? (
                <Button onClick={onClose} className="w-full" size="lg">
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowSteps(false);
                      resetApproval();
                      resetRepay();
                    }}
                    disabled={isApproving || isRepaying}
                    size="lg"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={currentStep === 1 ? handleApprove : handleRepay}
                    disabled={isApproving || isRepaying}
                    className="flex-1"
                    size="lg"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : isRepaying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Repaying...
                      </>
                    ) : currentStep === 1 ? (
                      `Approve USDS`
                    ) : (
                      "Repay Loan"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main input view
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Repay Loan</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Repay Amount Input */}
          <div>
            <div className="bg-surface-a3 rounded-3xl p-4 border border-a3-b">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Repay</label>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  max={totalDebt}
                  onScroll={(e) => e.currentTarget.blur()}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="text-3xl h-12 pr-24 border-0 shadow-none pl-0 bg-transparent"
                />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-full bg-surface-a5 p-2 border border-a5-b">
                    <img src={USDSIcon} alt="USDS" className="w-5 h-5" />
                    <span className="font-medium text-sm">USDS</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <div className="flex items-center gap-1 text-secondary-t">
                  <span>USDS Balance:</span>
                  <span>
                    {usdsBalance
                      ? parseFloat(formatEther(usdsBalance)).toFixed(2)
                      : "0"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-secondary-t">Max debt:</span>
                  <span>{totalDebt}</span>
                  <Button
                    variant="secondary"
                    className="h-6"
                    onClick={handleMaxClick}
                  >
                    Max
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Position Info */}
          <div className="bg-surface-a3 rounded-xl p-4 border border-a3-b space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-secondary-t">Collateral</span>
              <div className="flex items-center gap-1">
                <img src={cdUSDSIcon} alt="cdUSDS" className="w-4 h-4" />
                <span className="font-medium">
                  {collateralAmount} {collateralToken}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-secondary-t">Debt</span>
              <div className="flex items-center gap-1">
                <img src={USDSIcon} alt="USDS" className="w-4 h-4" />
                <span className="font-medium">{totalDebt} USDS</span>
              </div>
            </div>
            {loanData && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary-t">Principal</span>
                  <span className="font-medium">
                    {parseFloat(formatEther(loanData.principal)).toFixed(2)} USDS
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary-t">Interest</span>
                  <span className="font-medium">
                    {parseFloat(formatEther(loanData.interest)).toFixed(2)} USDS
                  </span>
                </div>
              </>
            )}
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!isValidAmount}
            onClick={handleStartRepay}
          >
            {!repayAmount || repayAmount === "0"
              ? "Enter amount"
              : !isValidAmount
              ? "Invalid amount"
              : `Repay ${parseFloat(repayAmount).toFixed(2)} USDS`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
