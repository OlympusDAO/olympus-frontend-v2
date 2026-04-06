import { useState, useMemo } from "react";
import { parseUnits, formatUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { TokenBigInput } from "@/components/ui/token-big-input";
import { LtvSlider } from "./ltv-slider";
import { CoolerApprovalModal } from "./cooler-approval-modal";
import { useToken } from "@/lib/hooks/useToken";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useMonoCoolerCalculations } from "@/lib/hooks/cooler/useMonoCoolerCalculations";
import { useMonoCoolerDebt } from "@/lib/hooks/cooler/useMonoCoolerDebt";
import { useMonoCoolerPosition } from "@/lib/hooks/cooler/useMonoCoolerPosition";
import { useMonoCoolerAuthorization } from "@/lib/hooks/cooler/useMonoCoolerAuthorization";
import { useIsSmartContractWallet } from "@/lib/hooks/cooler/useIsSmartContractWallet";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { TokenName } from "@/lib/tokens";

const ZERO = 0n;

interface BorrowFormProps {
  loan?: {
    debt: bigint;
    collateral: bigint;
  };
}

export function BorrowForm({ loan }: BorrowFormProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();
  const gohmToken = useToken(TokenName.GOHM, address);
  const usdsToken = useToken(TokenName.USDS, address);

  useMonoCoolerPosition();
  const { isSmartContractWallet } = useIsSmartContractWallet();
  const { isAuthorized, setAuthorization, isSettingAuthorization } = useMonoCoolerAuthorization();

  const monoCoolerAddress = getContractAddress(ContractName.COOLER_V2_MONOCOOLER, chainId);
  const compositesAddress = getContractAddress(ContractName.COOLER_V2_COMPOSITES, chainId);

  const {
    collateralAmount,
    borrowAmount,
    ltvPercentage,
    projectedDebt,
    additionalBorrowingAvailable,
    isBelowMinDebt,
    handleLtvChange,
    handleCollateralChange,
    handleDebtChange,
  } = useMonoCoolerCalculations({ loan, isRepayMode: false });

  const {
    borrow,
    addCollateral,
    addCollateralAndBorrow,
    isBorrowing,
    isAddingCollateral,
    isAddingCollateralAndBorrowing,
    borrowHash,
    addCollateralHash,
    addCollateralAndBorrowHash,
    isBorrowSuccess,
    isAddCollateralSuccess,
    isAddCollateralAndBorrowSuccess,
    signAuthorization,
    isSigning,
    isSignSuccess,
  } = useMonoCoolerDebt();

  // Determine operation type
  const isComposite = collateralAmount > ZERO && borrowAmount > ZERO;
  const isBorrowOnly = collateralAmount === ZERO && borrowAmount > ZERO;
  const isCollateralOnly = collateralAmount > ZERO && borrowAmount === ZERO;

  // The spender for approval depends on operation type
  const spenderAddress = isComposite ? compositesAddress : monoCoolerAddress;

  const { allowance, queryKey: allowanceQueryKey } = useTokenAllowance(
    gohmToken.address!,
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
    if (collateralAmount === ZERO) return false;
    if (allowance === undefined) return true;
    return allowance < collateralAmount;
  }, [allowance, collateralAmount]);

  const hasSufficientAllowance = !needsApproval;

  // For composite SCW: needs onchain authorization
  const needsScwAuthorization = isComposite && isSmartContractWallet && !isAuthorized;
  // For composite EOA: needs EIP-712 signature
  const needsEoaSignature = isComposite && !isSmartContractWallet;

  const isAnyPending =
    isBorrowing ||
    isAddingCollateral ||
    isAddingCollateralAndBorrowing ||
    isApproving ||
    isSigning ||
    isSettingAuthorization;

  // Collateral input string
  const collateralInputValue = collateralAmount > ZERO ? formatUnits(collateralAmount, 18) : "";
  const borrowInputValue = borrowAmount > ZERO ? formatUnits(borrowAmount, 18) : "";

  const handleCollateralInputChange = (value: string) => {
    if (!value || value === "0") {
      handleCollateralChange(ZERO);
      return;
    }
    try {
      handleCollateralChange(parseUnits(value, 18));
    } catch {
      // invalid input, ignore
    }
  };

  const handleBorrowInputChange = (value: string) => {
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

  // Validation state for the main button
  const validationState = useMemo(() => {
    if (!address) return { label: "Connect Wallet", disabled: true };
    if (collateralAmount === ZERO && borrowAmount === ZERO)
      return { label: "Enter Amount", disabled: true };
    if (
      collateralAmount > ZERO &&
      gohmToken.balance !== undefined &&
      collateralAmount > gohmToken.balance
    )
      return { label: "Insufficient gOHM Balance", disabled: true };
    if (borrowAmount > ZERO && borrowAmount > additionalBorrowingAvailable)
      return { label: "Exceeds Available Borrow", disabled: true };
    if (isBelowMinDebt && projectedDebt > ZERO)
      return { label: "Minimum debt is 1,000 USDS", disabled: true };
    return { label: getActionLabel(), disabled: false };
  }, [
    address,
    collateralAmount,
    borrowAmount,
    gohmToken.balance,
    additionalBorrowingAvailable,
    isBelowMinDebt,
    projectedDebt,
    isComposite,
    isBorrowOnly,
    isCollateralOnly,
  ]);

  function getActionLabel() {
    if (isComposite) return "Add Collateral & Borrow";
    if (isBorrowOnly) return "Borrow";
    if (isCollateralOnly) return "Add Collateral";
    return "Enter Amount";
  }

  const handleSubmitClick = () => {
    if (validationState.disabled) return;
    setIsModalOpen(true);
  };

  const executeTransaction = () => {
    if (isComposite) {
      addCollateralAndBorrow(collateralAmount, borrowAmount, isAuthorized);
    } else if (isBorrowOnly) {
      borrow(borrowAmount);
    } else if (isCollateralOnly) {
      addCollateral(collateralAmount);
    }
  };

  // Modal step logic
  const modalSteps = useMemo(() => {
    const steps = [];
    let stepNum = 1;

    steps.push({
      number: stepNum++,
      title: "Approve gOHM",
      isActive: needsApproval && !approvalSuccess,
      isCompleted: hasSufficientAllowance || approvalSuccess,
      isLoading: isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    });

    if (needsScwAuthorization) {
      steps.push({
        number: stepNum++,
        title: "Authorize Composites",
        isActive: (hasSufficientAllowance || approvalSuccess) && !isAuthorized,
        isCompleted: isAuthorized,
        isLoading: isSettingAuthorization,
      });
    }

    if (needsEoaSignature) {
      steps.push({
        number: stepNum++,
        title: "Sign Authorization",
        isActive: (hasSufficientAllowance || approvalSuccess) && !isSignSuccess,
        isCompleted: isSignSuccess,
        isLoading: isSigning,
      });
    }

    const txTitle = isComposite
      ? "Add Collateral & Borrow"
      : isBorrowOnly
        ? "Borrow"
        : "Add Collateral";

    const txSuccess = isComposite
      ? isAddCollateralAndBorrowSuccess
      : isBorrowOnly
        ? isBorrowSuccess
        : isAddCollateralSuccess;

    const txHash = isComposite
      ? addCollateralAndBorrowHash
      : isBorrowOnly
        ? borrowHash
        : addCollateralHash;

    const txPending = isComposite
      ? isAddingCollateralAndBorrowing
      : isBorrowOnly
        ? isBorrowing
        : isAddingCollateral;

    steps.push({
      number: stepNum,
      title: txTitle,
      detail:
        collateralAmount > ZERO && borrowAmount > ZERO
          ? `${Number(formatUnits(collateralAmount, 18)).toFixed(4)} gOHM → ${Number(formatUnits(borrowAmount, 18)).toFixed(2)} USDS`
          : undefined,
      isActive:
        (hasSufficientAllowance || approvalSuccess) &&
        (!needsScwAuthorization || isAuthorized) &&
        (!needsEoaSignature || isSignSuccess),
      isCompleted: txSuccess,
      isLoading: txPending,
      hash: txSuccess ? txHash : undefined,
    });

    return steps;
  }, [
    needsApproval,
    approvalSuccess,
    hasSufficientAllowance,
    isApproving,
    approvalHash,
    needsScwAuthorization,
    isAuthorized,
    isSettingAuthorization,
    needsEoaSignature,
    isSignSuccess,
    isSigning,
    isComposite,
    isBorrowOnly,
    isCollateralOnly,
    isAddCollateralAndBorrowSuccess,
    isBorrowSuccess,
    isAddCollateralSuccess,
    addCollateralAndBorrowHash,
    borrowHash,
    addCollateralHash,
    isAddingCollateralAndBorrowing,
    isBorrowing,
    isAddingCollateral,
    collateralAmount,
    borrowAmount,
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

    if (activeStep.title === "Approve gOHM") {
      if (!gohmToken.address || !spenderAddress) return;
      approve({
        tokenAddress: gohmToken.address,
        spender: spenderAddress,
        amount: collateralAmount,
        queryKey: allowanceQueryKey,
      });
    } else if (activeStep.title === "Authorize Composites") {
      setAuthorization();
    } else if (activeStep.title === "Sign Authorization") {
      signAuthorization();
    } else {
      executeTransaction();
    }
  };

  const modalActionLabel = useMemo(() => {
    const activeStep = modalSteps.find((s) => s.isActive && !s.isCompleted);
    return activeStep?.title || "Continue";
  }, [modalSteps]);

  // Available to borrow token override: show available amount instead of wallet balance
  const usdsTokenWithAvailable = useMemo(
    () => ({
      ...usdsToken,
      balance: additionalBorrowingAvailable,
    }),
    [usdsToken, additionalBorrowingAvailable],
  );

  return (
    <>
      <div data-slot="borrow-form" className="flex flex-col gap-4">
        <TokenBigInput
          label="Add Collateral"
          token={gohmToken}
          value={collateralInputValue}
          onChange={handleCollateralInputChange}
          disabled={isAnyPending}
        />

        <TokenBigInput
          label="Borrow"
          balanceLabel="Available"
          token={usdsTokenWithAvailable}
          value={borrowInputValue}
          onChange={handleBorrowInputChange}
          disabled={isAnyPending}
        />

        <div className="px-1">
          <LtvSlider
            ltvPercentage={ltvPercentage}
            onLtvChange={handleLtvChange}
            isRepayMode={false}
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
