import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, zeroAddress } from "viem";
import { useAccount, useChainId } from "wagmi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  TransactionStepperDialog,
  TransactionSuccessDialog,
  type TransactionStep,
} from "@/components/transaction-steps";
import { Button } from "@/components/ui/button";
import { TokenBigInput } from "@/components/ui/token-big-input";
import { useToken } from "@/lib/hooks/useToken";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useUnstakeV1 } from "@/lib/hooks/useUnstakeV1";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TokenName, getTokenAddress } from "@/lib/tokens";

interface UnstakeSohmV1ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OHM_DECIMALS = 9;

export function UnstakeSohmV1Modal({ isOpen, onClose }: UnstakeSohmV1ModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [amount, setAmount] = useState("");
  const [showSteps, setShowSteps] = useState(false);

  const stakingV1 = getContractAddress(ContractName.STAKING_V1, chainId);
  const sohmV1Address = getTokenAddress(TokenName.V1_SOHM, chainId);

  const sohmToken = useToken(TokenName.V1_SOHM, address);
  const ohmToken = useToken(TokenName.OHM);
  // sOHM v1 has no price feed; show value using the OHM price (1:1 with OHM v1).
  const inputToken = useMemo(
    () => ({ ...sohmToken, price: ohmToken.price }),
    [sohmToken, ohmToken.price],
  );

  const balance = sohmToken.balance ?? 0n;

  const amountBigInt = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, OHM_DECIMALS);
    } catch {
      return 0n;
    }
  }, [amount]);

  // Unstaking is 1:1 — you receive the same amount of OHM v1.
  const receiveAmount = amount || "0";

  const { allowance, queryKey } = useTokenAllowance(
    sohmV1Address ?? zeroAddress,
    address,
    stakingV1,
  );
  const hasSufficientAllowance = allowance !== undefined && allowance >= amountBigInt;

  const {
    approve,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
    reset: resetApproval,
  } = useTokenApproval();

  const {
    unstake,
    isPending: isUnstaking,
    isSuccess: unstakeSuccess,
    hash: unstakeHash,
    reset: resetUnstake,
  } = useUnstakeV1();

  const currentStep = hasSufficientAllowance || approvalSuccess ? 2 : 1;

  const inputButton = useMemo(() => {
    if (!address) return { disabled: true, label: "Connect Wallet" };
    if (!amount || amountBigInt === 0n) return { disabled: true, label: "Enter Amount" };
    if (amountBigInt > balance) return { disabled: true, label: "Insufficient sOHM v1 Balance" };
    return { disabled: false, label: "Unstake to OHM v1" };
  }, [address, amount, amountBigInt, balance]);

  const handleMax = () => setAmount(formatUnits(balance, OHM_DECIMALS));

  const handleApprove = () => {
    if (!sohmV1Address || !stakingV1) return;
    approve({ tokenAddress: sohmV1Address, spender: stakingV1, amount: amountBigInt, queryKey });
  };

  const handleUnstake = () => {
    unstake({ amount: amountBigInt, queryKey });
  };

  const handleClose = () => onClose();

  // Reset all state once the modal is closed so reopening starts fresh (not on success).
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset fns are stable enough; only re-run on open/close
  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setShowSteps(false);
      resetApproval();
      resetUnstake();
    }
  }, [isOpen]);

  const steps: TransactionStep[] = [
    {
      number: 1,
      title: "Approve sOHM v1",
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
      isLoading: currentStep === 1 && isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    },
    {
      number: 2,
      title: "Unstake to OHM v1",
      badges: [{ label: `-${amount} sOHM v1` }, { label: `+${receiveAmount} OHM v1` }],
      isActive: currentStep === 2,
      isCompleted: unstakeSuccess,
      isLoading: currentStep === 2 && isUnstaking,
      hash: unstakeSuccess ? unstakeHash : undefined,
    },
  ];

  // Success state.
  if (unstakeSuccess) {
    return (
      <TransactionSuccessDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Congrats, all done!"
        description="Your sOHM v1 has been unstaked to OHM v1 — you can now migrate it."
        steps={steps}
      />
    );
  }

  // Stepper phase.
  if (showSteps) {
    return (
      <TransactionStepperDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Unstake sOHM v1"
        currentStep={currentStep}
        steps={steps}
        showBusyNotice={currentStep === 2 && isUnstaking}
        button={{
          label: currentStep === 2 ? "Unstake to OHM v1" : "Approve sOHM v1",
          busyLabel: isApproving
            ? "Confirming Approval In Your Wallet"
            : "Confirming Unstake In Your Wallet",
          isBusy: isApproving || isUnstaking,
          onClick: currentStep === 1 ? handleApprove : handleUnstake,
        }}
      />
    );
  }

  // Input phase.
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-4">
        <DialogHeader className="text-center !gap-2">
          <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
            Unstake sOHM v1
          </DialogTitle>
          <p className="text-xs/4 font-normal text-secondary-t">
            Convert sOHM v1 to OHM v1 (1:1) so you can migrate it to OHM v2.
          </p>
        </DialogHeader>

        <TokenBigInput
          label="Unstake"
          token={inputToken}
          value={amount}
          onChange={(val) => setAmount(val)}
          onMax={handleMax}
        />

        <div className="flex justify-between text-sm px-1">
          <span className="text-secondary-t">You receive</span>
          <span className="font-semibold text-primary-t">≈ {receiveAmount} OHM v1</span>
        </div>

        <Button
          onClick={() => setShowSteps(true)}
          disabled={inputButton.disabled}
          className="w-full"
        >
          {inputButton.label}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
