import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { isAddress, type Address } from "viem";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDelegateVoting } from "@/modules/governance/hooks/useDelegateVoting";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Dialog for delegating gOHM voting power to another address.
 * Shows the current delegate, an input for the new delegate address,
 * and buttons to set to self or delegate.
 */
export function DelegateVotingModal({
  open,
  onClose,
  currentDelegate,
}: {
  open: boolean;
  onClose: () => void;
  currentDelegate?: string;
}) {
  const { address } = useAccount();
  const { delegate, isPending, isSuccess, reset } = useDelegateVoting();

  const [delegateAddress, setDelegateAddress] = useState("");
  const isValidAddress = isAddress(delegateAddress);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  function handleClose() {
    setDelegateAddress("");
    reset();
    onClose();
  }

  function handleDelegate() {
    if (!isValidAddress) return;
    delegate({ delegationAddress: delegateAddress as Address });
  }

  function handleSetToMyWallet() {
    if (address) {
      setDelegateAddress(address);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delegate Voting Power</DialogTitle>
          <DialogDescription>Delegate your gOHM voting power to another address.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Current Delegation */}
          {currentDelegate && (
            <div className="flex items-center justify-between rounded-lg bg-surface-a3 px-3 py-2.5">
              <span className="text-xs text-secondary-t">Currently Delegated To</span>
              <span className="text-xs font-mono text-primary-t">
                {shortenAddress(currentDelegate)}
              </span>
            </div>
          )}

          {/* Delegate Address Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-secondary-t" htmlFor="delegateAddress">
              Delegate Address
            </label>
            <Input
              id="delegateAddress"
              placeholder="0x..."
              value={delegateAddress}
              onChange={(e) => setDelegateAddress(e.target.value)}
              className="font-mono text-sm"
            />
            {delegateAddress && !isValidAddress && (
              <span className="text-xs text-red-400">Invalid Ethereum address</span>
            )}
          </div>

          {isSuccess ? (
            <div className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400 text-center">
              Delegation successful!
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSetToMyWallet}
                className="shrink-0"
              >
                Set to My Wallet
              </Button>
              <Button
                onClick={handleDelegate}
                disabled={!isValidAddress || isPending}
                className="flex-1"
              >
                {isPending ? "Delegating..." : "Delegate Voting"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
