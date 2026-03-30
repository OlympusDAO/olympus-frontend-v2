import { useState } from "react";
import { isAddress } from "viem";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "wagmi";
import { Trash2, Plus } from "lucide-react";

type DelegationEntry = {
  address: string;
  amount: string;
};

const MAX_ENTRIES = 10;

function createEmptyEntry(): DelegationEntry {
  return { address: "", amount: "" };
}

/**
 * Dialog for managing Cooler V2 multi-delegation of voting power.
 * Allows up to 10 unique delegation addresses with specified amounts.
 */
export function CoolerDelegationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address } = useAccount();
  const [entries, setEntries] = useState<DelegationEntry[]>([createEmptyEntry()]);

  function handleClose() {
    setEntries([createEmptyEntry()]);
    onClose();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) handleClose();
  }

  function updateEntry(index: number, field: keyof DelegationEntry, value: string) {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addEntry() {
    if (entries.length >= MAX_ENTRIES) return;
    setEntries((prev) => [...prev, createEmptyEntry()]);
  }

  function removeEntry(index: number) {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSetToMyWallet(index: number) {
    if (address) {
      updateEntry(index, "address", address);
    }
  }

  const hasValidEntries = entries.some(
    (entry) => isAddress(entry.address) && Number(entry.amount) > 0,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Cooler V2 Delegations</DialogTitle>
          <DialogDescription>
            Delegate your Cooler V2 collateral voting power to up to 10 unique addresses.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Info Banner */}
          <div className="rounded-lg bg-blue-500/10 px-3 py-2.5 text-xs text-blue-400">
            You can delegate to up to {MAX_ENTRIES} unique addresses. The total delegated amount
            cannot exceed your available collateral.
          </div>

          {/* Available Collateral */}
          <div className="flex items-center justify-between rounded-lg bg-surface-a3 px-3 py-2.5">
            <span className="text-xs text-secondary-t">Available Collateral</span>
            <span className="text-sm font-semibold text-primary-t">-- gOHM</span>
          </div>

          {/* Delegation Entries */}
          <div className="flex flex-col gap-3">
            {entries.map((entry, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="0x... delegate address"
                      value={entry.address}
                      onChange={(e) => updateEntry(index, "address", e.target.value)}
                      className="font-mono text-xs flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={entry.amount}
                      onChange={(e) => updateEntry(index, "amount", e.target.value)}
                      className="text-xs w-24"
                    />
                  </div>
                  {entry.address && !isAddress(entry.address) && (
                    <span className="text-[11px] text-red-400">Invalid address</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  disabled={entries.length <= 1}
                  className="mt-2 text-tertiary-t hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Entry */}
          {entries.length < MAX_ENTRIES && (
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors self-start"
            >
              <Plus className="size-3.5" />
              Add Additional Delegation Address
            </button>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSetToMyWallet(0)}
              className="shrink-0"
            >
              Set to My Wallet
            </Button>
            <Button disabled={!hasValidEntries} className="flex-1">
              Delegate Voting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
