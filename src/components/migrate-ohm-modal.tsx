import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, ExternalLink, Info, Loader2 } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TokenBigInput } from "@/components/ui/token-big-input";
import { useToken } from "@/lib/hooks/useToken";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { useMigrate } from "@/lib/hooks/useMigrate";
import { usePreviewMigrate } from "@/lib/hooks/usePreviewMigrate";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TokenName, getTokenAddress } from "@/lib/tokens";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";
import { formatTokenDisplay } from "@/lib/math";
import type { MigrationClaim } from "@/lib/hooks/useMigrationClaim";

interface MigrateOhmModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: MigrationClaim;
  /** Remaining allocation = allocated − already migrated (raw, 9 decimals). */
  remaining: bigint;
}

const OHM_DECIMALS = 9;

function bigMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function formatTxHash(hash?: `0x${string}`) {
  return hash ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : "";
}

function formatOhm(value: bigint): string {
  return formatTokenDisplay(value, OHM_DECIMALS, { digits: 4 });
}

type Step = {
  number: number;
  title: string;
  badges?: { label: string }[];
  isActive: boolean;
  isCompleted: boolean;
  isLoading: boolean;
  hash?: `0x${string}`;
};

export function MigrateOhmModal({ isOpen, onClose, claim, remaining }: MigrateOhmModalProps) {
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

  const { allowance, queryKey } = useTokenAllowance(ohmV1Address!, address, migrator);
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
    return { disabled: false, label: "Migrate to OHM v2" };
  }, [address, amount, amountBigInt, balance, remaining]);

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

  const steps: Step[] = [
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
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-8 w-8 text-green" />
            </div>
            <DialogTitle className="text-xl font-semibold mb-2">Congrats, all done!</DialogTitle>
            <p className="text-sm text-secondary-t mb-6">Your transactions have been executed.</p>
          </div>

          <div className="bg-surface-a3 border border-a3-b rounded-3xl">
            {steps.map((step, index) => (
              <div key={step.number}>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-6 h-6 rounded-full bg-green/20 flex items-center justify-center shrink-0">
                    <CheckIcon className="h-4 w-4 text-green" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{step.title}</div>
                    {step.badges && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {step.badges.map((badge) => (
                          <span
                            key={badge.label}
                            className="text-xs text-secondary-t rounded-full border px-2 py-0.5 border-a10-b"
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {step.hash && (
                      <Link
                        target="_blank"
                        rel="noopener noreferrer"
                        to={`${blockExplorerTxBaseUrl}${step.hash}`}
                        className="flex items-center gap-1 text-xs text-blue hover:text-blue-800 mt-1"
                      >
                        {formatTxHash(step.hash)}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && <div className="border-b border-a5-b mx-4" />}
              </div>
            ))}
          </div>

          <Button onClick={handleClose} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Phase 2 — canonical multi-transaction stepper.
  if (showSteps) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0 !rounded-3xl">
          <DialogHeader className="px-6 pt-6 pb-2 text-center !gap-6">
            <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
              Migrate OHM v1 → v2
            </DialogTitle>
            <p className="text-xs/4 font-normal text-secondary-t">
              Transaction {currentStep}/2. Proceed with your wallet.
            </p>
          </DialogHeader>

          <div className="px-6 pb-6">
            <div className="bg-surface-a3 border border-a3-b rounded-3xl">
              {steps.map((step, index) => (
                <div key={step.number}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-medium ${
                          step.isCompleted
                            ? "text-green border-green"
                            : step.isActive
                              ? "text-primary-t border-primary-t"
                              : "text-secondary-t border-a10-b"
                        }`}
                      >
                        {step.isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : step.isCompleted ? (
                          <CheckIcon className="h-3 w-3" />
                        ) : (
                          step.number
                        )}
                      </div>
                      <div>
                        <div className="text-sm/5 font-semibold text-primary-t">{step.title}</div>
                        {step.badges && (
                          <div className="flex gap-1 mt-1">
                            {step.badges.map((badge) => (
                              <span
                                key={badge.label}
                                className="text-xs text-secondary-t rounded-full border px-2 py-0.5 border-a10-b"
                              >
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        )}
                        {step.isCompleted && step.hash && (
                          <Link
                            target="_blank"
                            rel="noopener noreferrer"
                            to={`${blockExplorerTxBaseUrl}${step.hash}`}
                            className="flex items-center gap-1 text-xs text-blue hover:text-blue-800 mt-1"
                          >
                            {formatTxHash(step.hash)}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && <div className="border-b border-a5-b mx-4" />}
                </div>
              ))}
            </div>

            {currentStep === 2 && isMigrating && (
              <div className="mt-4 flex items-start gap-2 bg-blue/10 border border-blue/20 rounded-xl p-3">
                <Info className="w-4 h-4 text-blue mt-0.5 shrink-0" />
                <p className="text-sm text-primary-t">
                  Please don't close this modal until all wallet transactions are confirmed.
                </p>
              </div>
            )}

            <div className="mt-6">
              <Button
                onClick={currentStep === 1 ? handleApprove : handleMigrate}
                disabled={isApproving || isMigrating}
                className="w-full"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming Approval In Your Wallet
                  </>
                ) : isMigrating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming Migration In Your Wallet
                  </>
                ) : currentStep === 2 ? (
                  "Migrate to OHM v2"
                ) : (
                  "Approve OHM v1"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
