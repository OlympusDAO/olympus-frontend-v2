import { useState, useMemo } from "react";
import { parseUnits, formatUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { TokenBigInput } from "@/components/ui/token-big-input";
import { Icon } from "@/components/icon";
import { LtvSlider } from "./ltv-slider";
import { CoolerApprovalModal } from "./cooler-approval-modal";
import { useToken } from "@/lib/hooks/useToken";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useMonoCoolerCalculations } from "@/lib/hooks/cooler/useMonoCoolerCalculations";
import { useMonoCoolerDebt, calculateRepayAmount } from "@/lib/hooks/cooler/useMonoCoolerDebt";
import { useMonoCoolerPosition } from "@/lib/hooks/cooler/useMonoCoolerPosition";
import { useMonoCoolerAuthorization } from "@/lib/hooks/cooler/useMonoCoolerAuthorization";
import { useIsSmartContractWallet } from "@/lib/hooks/cooler/useIsSmartContractWallet";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { TokenName } from "@/lib/tokens";

const ZERO = 0n;
const MAX_UINT256 = 2n ** 256n - 1n;

interface RepayFormProps {
  loan?: {
    debt: bigint;
    collateral: bigint;
  };
}

function formatGohm(value: bigint): string {
  const num = Number(formatUnits(value, 18));
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export function RepayForm({ loan }: RepayFormProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();
  const usdsToken = useToken(TokenName.USDS, address);

  const { position } = useMonoCoolerPosition();
  const { isSmartContractWallet } = useIsSmartContractWallet();
  const { isAuthorized, setAuthorization, isSettingAuthorization } = useMonoCoolerAuthorization();

  const monoCoolerAddress = getContractAddress(ContractName.COOLER_V2_MONOCOOLER, chainId);
  const compositesAddress = getContractAddress(ContractName.COOLER_V2_COMPOSITES, chainId);

  const {
    borrowAmount: repayAmount,
    ltvPercentage,
    projectedDebt,
    currentDebt,
    collateralToBeReleased,
    isBelowMinDebt,
    handleLtvChange,
    handleDebtChange,
  } = useMonoCoolerCalculations({ loan, isRepayMode: true });

  const {
    repay,
    repayAndRemoveCollateral,
    isRepaying,
    isWithdrawingCollateral,
    isRepayingAndRemovingCollateral,
    repayHash,
    repayAndRemoveCollateralHash,
    isRepaySuccess,
    isRepayAndRemoveCollateralSuccess,
  } = useMonoCoolerDebt();

  // Determine operation type
  const isFullRepay = repayAmount > ZERO && repayAmount >= currentDebt;
  const isRepayWithWithdraw = repayAmount > ZERO && collateralToBeReleased > ZERO;
  const isRepayOnly = repayAmount > ZERO && collateralToBeReleased === ZERO;
  const isComposite = isRepayWithWithdraw;

  // Spender for USDS approval
  const spenderAddress = isComposite ? compositesAddress : monoCoolerAddress;

  const { allowance, queryKey: allowanceQueryKey } = useTokenAllowance(
    usdsToken.address!,
    address,
    spenderAddress,
  );

  const {
    approve,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
  } = useTokenApproval();

  const needsApproval = useMemo(() => {
    if (repayAmount === ZERO) return false;
    if (allowance === undefined) return true;
    const requiredAmount = calculateRepayAmount(repayAmount, position?.interestRateBps ?? 0, isFullRepay);
    return allowance < requiredAmount;
  }, [allowance, repayAmount, position?.interestRateBps, isFullRepay]);

  const hasSufficientAllowance = !needsApproval;

  const needsScwAuthorization = isComposite && isSmartContractWallet && !isAuthorized;

  const isAnyPending =
    isRepaying || isWithdrawingCollateral || isRepayingAndRemovingCollateral || isApproving || isSettingAuthorization;

  // Input values
  const repayInputValue = repayAmount > ZERO ? formatUnits(repayAmount, 18) : "";

  const handleRepayInputChange = (value: string) => {
    if (!value || value === "0") {
      handleDebtChange(ZERO);
      return;
    }
    try {
      handleDebtChange(parseUnits(value, 18));
    } catch {
      // invalid input, ignore
    }
  };

  // USDS token with max set to current debt
  const usdsTokenWithDebt = useMemo(
    () => ({
      ...usdsToken,
      balance: currentDebt,
    }),
    [usdsToken, currentDebt],
  );

  // Validation state for the main button
  const validationState = useMemo(() => {
    if (!address) return { label: "Connect Wallet", disabled: true };
    if (repayAmount === ZERO) return { label: "Enter Amount", disabled: true };
    if (repayAmount > ZERO && usdsToken.balance !== undefined && repayAmount > usdsToken.balance)
      return { label: "Insufficient USDS Balance", disabled: true };
    if (isBelowMinDebt && projectedDebt > ZERO)
      return { label: "Minimum debt is 1,000 USDS", disabled: true };
    return { label: getActionLabel(), disabled: false };
  }, [address, repayAmount, usdsToken.balance, isBelowMinDebt, projectedDebt, isComposite, isRepayOnly, isFullRepay]);

  function getActionLabel() {
    if (isComposite) return "Repay & Withdraw";
    if (isRepayOnly) return isFullRepay ? "Repay All" : "Repay";
    return "Enter Amount";
  }

  const handleSubmitClick = () => {
    if (validationState.disabled) return;
    setIsModalOpen(true);
  };

  const executeTransaction = () => {
    if (isComposite) {
      repayAndRemoveCollateral(repayAmount, collateralToBeReleased, isFullRepay, isAuthorized);
    } else if (isRepayOnly) {
      repay(repayAmount, isFullRepay);
    }
  };

  // Modal step logic
  const modalSteps = useMemo(() => {
    const steps = [];
    let stepNum = 1;

    if (needsApproval || approvalSuccess) {
      steps.push({
        number: stepNum++,
        title: "Approve USDS",
        isActive: needsApproval && !approvalSuccess,
        isCompleted: hasSufficientAllowance || approvalSuccess,
        isLoading: isApproving,
        hash: approvalSuccess ? approvalHash : undefined,
      });
    }

    if (needsScwAuthorization) {
      steps.push({
        number: stepNum++,
        title: "Authorize Composites",
        isActive: (hasSufficientAllowance || approvalSuccess) && !isAuthorized,
        isCompleted: isAuthorized,
        isLoading: isSettingAuthorization,
      });
    }

    const txTitle = isComposite ? "Repay & Withdraw" : isFullRepay ? "Repay All" : "Repay";

    const txSuccess = isComposite ? isRepayAndRemoveCollateralSuccess : isRepaySuccess;
    const txHash = isComposite ? repayAndRemoveCollateralHash : repayHash;
    const txPending = isComposite ? isRepayingAndRemovingCollateral : isRepaying;

    steps.push({
      number: stepNum,
      title: txTitle,
      detail: `${Number(formatUnits(repayAmount, 18)).toFixed(2)} USDS`,
      isActive: (hasSufficientAllowance || approvalSuccess) && (!needsScwAuthorization || isAuthorized),
      isCompleted: txSuccess,
      isLoading: txPending,
      hash: txSuccess ? txHash : undefined,
    });

    return steps;
  }, [
    needsApproval, approvalSuccess, hasSufficientAllowance, isApproving, approvalHash,
    needsScwAuthorization, isAuthorized, isSettingAuthorization,
    isComposite, isFullRepay,
    isRepayAndRemoveCollateralSuccess, isRepaySuccess,
    repayAndRemoveCollateralHash, repayHash,
    isRepayingAndRemovingCollateral, isRepaying,
    repayAmount,
  ]);

  const modalCurrentStep = useMemo(() => {
    for (const step of modalSteps) {
      if (!step.isCompleted) return step.number;
    }
    return modalSteps.length;
  }, [modalSteps]);

  const isAllComplete = modalSteps.every((s) => s.isCompleted);

  const handleModalAction = () => {
    const activeStep = modalSteps.find((s) => s.isActive && !s.isCompleted);
    if (!activeStep) return;

    if (activeStep.title === "Approve USDS") {
      if (!usdsToken.address || !spenderAddress) return;
      approve({
        tokenAddress: usdsToken.address,
        spender: spenderAddress,
        amount: MAX_UINT256,
        queryKey: allowanceQueryKey,
      });
    } else if (activeStep.title === "Authorize Composites") {
      setAuthorization();
    } else {
      executeTransaction();
    }
  };

  const modalActionLabel = useMemo(() => {
    const activeStep = modalSteps.find((s) => s.isActive && !s.isCompleted);
    return activeStep?.title || "Continue";
  }, [modalSteps]);

  return (
    <>
      <div data-slot="repay-form" className="flex flex-col gap-4">
        <TokenBigInput
          label="Repay"
          balanceLabel="Debt:"
          token={usdsTokenWithDebt}
          value={repayInputValue}
          onChange={handleRepayInputChange}
          disabled={isAnyPending}
        />

        <div className="rounded-2xl bg-surface-a3 border border-a3-b px-4 py-4">
          <p className="text-[15px]/[20px] font-medium mb-3">Withdraw Collateral</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-semibold">
              {collateralToBeReleased > ZERO ? formatGohm(collateralToBeReleased) : "0.0000"}
            </p>
            <div className="bg-surface-a3 border border-a3-b inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2">
              <Icon name="GOHMColorTokenIcon" className="size-5" />
              <p className="text-[15px]/[20px] font-semibold whitespace-nowrap">gOHM</p>
            </div>
          </div>
        </div>

        <div className="px-1">
          <LtvSlider
            ltvPercentage={ltvPercentage}
            onLtvChange={handleLtvChange}
            isRepayMode={true}
          />
        </div>

        <Button
          size="lg"
          className="w-full"
          disabled={validationState.disabled || isAnyPending}
          onClick={handleSubmitClick}
        >
          {isAnyPending ? "Processing..." : validationState.label}
        </Button>
      </div>

      <CoolerApprovalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={getActionLabel()}
        steps={modalSteps}
        currentStep={modalCurrentStep}
        totalSteps={modalSteps.length}
        isAllComplete={isAllComplete}
        isPending={isAnyPending}
        onAction={handleModalAction}
        actionLabel={modalActionLabel}
      />
    </>
  );
}
