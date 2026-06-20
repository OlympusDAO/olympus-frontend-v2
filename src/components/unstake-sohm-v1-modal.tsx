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
import { useUnstakeV1 } from "@/lib/hooks/useUnstakeV1";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TokenName, getTokenAddress } from "@/lib/tokens";
import { blockExplorerTxBaseUrl } from "@/lib/helpers";

interface UnstakeSohmV1ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OHM_DECIMALS = 9;

function formatTxHash(hash?: `0x${string}`) {
  return hash ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : "";
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

  const { allowance, queryKey } = useTokenAllowance(sohmV1Address!, address, stakingV1);
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

  const steps: Step[] = [
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
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-8 w-8 text-green" />
            </div>
            <DialogTitle className="text-xl font-semibold mb-2">Congrats, all done!</DialogTitle>
            <p className="text-sm text-secondary-t mb-6">
              Your sOHM v1 has been unstaked to OHM v1 — you can now migrate it.
            </p>
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

  // Stepper phase.
  if (showSteps) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full sm:max-w-md mx-auto p-0 gap-0 !rounded-3xl">
          <DialogHeader className="px-6 pt-6 pb-2 text-center !gap-6">
            <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
              Unstake sOHM v1
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

            {currentStep === 2 && isUnstaking && (
              <div className="mt-4 flex items-start gap-2 bg-blue/10 border border-blue/20 rounded-xl p-3">
                <Info className="w-4 h-4 text-blue mt-0.5 shrink-0" />
                <p className="text-sm text-primary-t">
                  Please don't close this modal until all wallet transactions are confirmed.
                </p>
              </div>
            )}

            <div className="mt-6">
              <Button
                onClick={currentStep === 1 ? handleApprove : handleUnstake}
                disabled={isApproving || isUnstaking}
                className="w-full"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming Approval In Your Wallet
                  </>
                ) : isUnstaking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming Unstake In Your Wallet
                  </>
                ) : currentStep === 2 ? (
                  "Unstake to OHM v1"
                ) : (
                  "Approve sOHM v1"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
