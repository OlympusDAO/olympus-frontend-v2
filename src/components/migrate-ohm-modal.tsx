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
import { useMigrate } from "@/lib/hooks/useMigrate";
import { usePreviewMigrate } from "@/lib/hooks/usePreviewMigrate";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TokenName, getTokenAddress } from "@/lib/tokens";
import { formatTokenDisplay } from "@/lib/math";
import type { MigrationClaim } from "@/lib/hooks/useMigrationClaim";

interface MigrateOhmModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: MigrationClaim;
  /** Remaining allocation = allocated − already migrated (raw, 9 decimals). */
  remaining: bigint;
  /** The migrator's global remaining OHM v2 mint approval (raw, 9 decimals). The
   * contract reverts with CapExceeded when the converted output exceeds this. */
  remainingMintApproval?: bigint;
}

const OHM_DECIMALS = 9;

function bigMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function formatOhm(value: bigint): string {
  return formatTokenDisplay(value, OHM_DECIMALS, { digits: 4 });
}

export function MigrateOhmModal({
  isOpen,
  onClose,
  claim,
  remaining,
  remainingMintApproval,
}: MigrateOhmModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [amount, setAmount] = useState("");
  const [showSteps, setShowSteps] = useState(false);

  const migrator = getContractAddress(ContractName.OHM_V1_MIGRATOR, chainId);
  const ohmV1Address = getTokenAddress(TokenName.V1_OHM, chainId);

  const v1Token = useToken(TokenName.V1_OHM, address);
  const ohmToken = useToken(TokenName.OHM);
  // V1 OHM has no price feed; show value using the OHM v2 price.
  const inputToken = useMemo(
    () => ({ ...v1Token, price: ohmToken.price }),
    [v1Token, ohmToken.price],
  );

  const balance = v1Token.balance ?? 0n;
  const maxMigratable = bigMin(remaining, balance);

  const amountBigInt = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, OHM_DECIMALS);
    } catch {
      return 0n;
    }
  }, [amount]);

  const { ohmV2Out } = usePreviewMigrate(amountBigInt);
  const receiveAmount = ohmV2Out !== undefined ? formatOhm(ohmV2Out) : "0";

  const { allowance, queryKey } = useTokenAllowance(ohmV1Address ?? zeroAddress, address, migrator);
  const hasSufficientAllowance = allowance !== undefined && allowance >= amountBigInt;

  const {
    approve,
    isPending: isApproving,
    isSuccess: approvalSuccess,
    hash: approvalHash,
    reset: resetApproval,
  } = useTokenApproval();

  const {
    migrate,
    isPending: isMigrating,
    isSuccess: migrateSuccess,
    hash: migrateHash,
    reset: resetMigrate,
  } = useMigrate();

  const currentStep = hasSufficientAllowance || approvalSuccess ? 2 : 1;

  // Phase 1 (input) button gating.
  const inputButton = useMemo(() => {
    if (!address) return { disabled: true, label: "Connect Wallet" };
    if (!amount || amountBigInt === 0n) return { disabled: true, label: "Enter Amount" };
    if (amountBigInt > balance) return { disabled: true, label: "Insufficient OHM v1 Balance" };
    if (amountBigInt > remaining) return { disabled: true, label: "Exceeds Allocation" };
    // The migrator reverts with CapExceeded when the converted OHM v2 output exceeds
    // its global remaining mint approval — block that here instead of on-chain.
    if (
      remainingMintApproval !== undefined &&
      ohmV2Out !== undefined &&
      ohmV2Out > remainingMintApproval
    ) {
      return { disabled: true, label: "Exceeds Migrator Capacity" };
    }
    return { disabled: false, label: "Migrate to OHM v2" };
  }, [address, amount, amountBigInt, balance, remaining, remainingMintApproval, ohmV2Out]);

  const handleMax = () => setAmount(formatUnits(maxMigratable, OHM_DECIMALS));

  const handleApprove = () => {
    if (!ohmV1Address || !migrator) return;
    approve({ tokenAddress: ohmV1Address, spender: migrator, amount: amountBigInt, queryKey });
  };

  const handleMigrate = () => {
    migrate({
      amount: amountBigInt,
      proof: claim.proof,
      allocatedAmount: claim.allocatedAmount,
      queryKey,
    });
  };

  const handleClose = () => onClose();

  // When the modal is closed, reset all transaction + input state so reopening starts
  // fresh instead of being stuck on the success screen. Runs once closed (content is
  // already unmounted), so there's no success→input flash during the close animation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset fns are stable enough; only re-run on open/close
  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setShowSteps(false);
      resetApproval();
      resetMigrate();
    }
  }, [isOpen]);

  const steps: TransactionStep[] = [
    {
      number: 1,
      title: "Approve OHM v1",
      isActive: currentStep === 1,
      isCompleted: currentStep > 1,
      isLoading: currentStep === 1 && isApproving,
      hash: approvalSuccess ? approvalHash : undefined,
    },
    {
      number: 2,
      title: "Migrate to OHM v2",
      badges: [{ label: `-${amount} OHM v1` }, { label: `+${receiveAmount} OHM v2` }],
      isActive: currentStep === 2,
      isCompleted: migrateSuccess,
      isLoading: currentStep === 2 && isMigrating,
      hash: migrateSuccess ? migrateHash : undefined,
    },
  ];

  // Success state — canonical "congrats" screen.
  if (migrateSuccess) {
    return (
      <TransactionSuccessDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Congrats, all done!"
        description="Your transactions have been executed."
        steps={steps}
      />
    );
  }

  // Phase 2 — canonical multi-transaction stepper.
  if (showSteps) {
    return (
      <TransactionStepperDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Migrate OHM v1 → v2"
        currentStep={currentStep}
        steps={steps}
        showBusyNotice={currentStep === 2 && isMigrating}
        button={{
          label: currentStep === 2 ? "Migrate to OHM v2" : "Approve OHM v1",
          busyLabel: isApproving
            ? "Confirming Approval In Your Wallet"
            : "Confirming Migration In Your Wallet",
          isBusy: isApproving || isMigrating,
          onClick: currentStep === 1 ? handleApprove : handleMigrate,
        }}
      />
    );
  }

  // Phase 1 — amount entry.
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-4">
        <DialogHeader className="text-center !gap-2">
          <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
            Migrate OHM v1 → v2
          </DialogTitle>
        </DialogHeader>

        {/* Allocation summary */}
        <div className="rounded-2xl bg-surface-a3 border border-a3-b p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-secondary-t">Total allocation</span>
            <span className="font-semibold text-primary-t">
              {formatOhm(claim.allocatedAmount)} OHM v1
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-t">Remaining to migrate</span>
            <span className="font-semibold text-primary-t">{formatOhm(remaining)} OHM v1</span>
          </div>
        </div>

        <TokenBigInput
          label="Migrate"
          token={inputToken}
          value={amount}
          onChange={(val) => setAmount(val)}
          onMax={handleMax}
        />

        <div className="flex justify-between text-sm px-1">
          <span className="text-secondary-t">You receive</span>
          <span className="font-semibold text-primary-t">≈ {receiveAmount} OHM v2</span>
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
