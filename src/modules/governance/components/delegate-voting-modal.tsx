import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { isAddress, type Address } from "viem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDelegateVoting } from "@/modules/governance/hooks/useDelegateVoting";
import { useCheckDelegation } from "@/modules/governance/hooks/useCheckDelegation";
import { shortenAddress } from "@/lib/helpers";

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
  const { data: delegatee } = useCheckDelegation({ address });
  const { delegate, isPending, isSuccess, reset } = useDelegateVoting();

  const [delegateAddress, setDelegateAddress] = useState("");
  const isValidAddress = isAddress(delegateAddress);

  const effectiveCurrentDelegate =
    currentDelegate ||
    (delegatee && delegatee.toLowerCase() !== address?.toLowerCase() ? delegatee : undefined);

  const handleClose = useCallback(() => {
    setDelegateAddress("");
    reset();
    onClose();
  }, [reset, onClose]);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, handleClose]);

  function handleDelegate() {
    if (!isValidAddress) return;
    delegate({ delegationAddress: delegateAddress as Address });
  }

  function handleSetToMyWallet() {
    if (address) setDelegateAddress(address);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-6 gap-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl/6 font-semibold text-primary-t tracking-[0.2px]">
            Delegate Voting
          </DialogTitle>
        </DialogHeader>

        {effectiveCurrentDelegate && (
          <div className="flex items-center justify-between">
            <span className="text-sm/5 font-normal text-secondary-t">Currently Delegated To</span>
            <span className="text-sm/5 font-semibold text-primary-t">
              {shortenAddress(effectiveCurrentDelegate as `0x${string}`)}
            </span>
          </div>
        )}

        <Input
          placeholder="Address"
          value={delegateAddress}
          onChange={(e) => setDelegateAddress(e.target.value)}
        />
        {delegateAddress && !isValidAddress && (
          <span className="text-xs text-red-400 -mt-4">Invalid Ethereum address</span>
        )}

        {isSuccess ? (
          <div className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400 text-center">
            Delegation successful!
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={handleSetToMyWallet}>
              Set to My Wallet
            </Button>
            <Button onClick={handleDelegate} disabled={!isValidAddress || isPending}>
              {isPending ? "Delegating..." : "Delegate Voting"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
