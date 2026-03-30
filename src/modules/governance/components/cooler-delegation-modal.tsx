import { useEffect, useMemo, useState } from "react";
import { isAddress, formatUnits } from "viem";
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
import { useMonoCoolerPosition } from "@/lib/hooks/cooler/useMonoCoolerPosition";
import {
  useMonoCoolerDelegations,
  computeDelegationDeltas,
} from "@/modules/governance/hooks/useMonoCoolerDelegations";

type DelegationEntry = {
  address: string;
  amount: string;
};

function createEmptyEntry(): DelegationEntry {
  return { address: "", amount: "" };
}

/**
 * Dialog for managing Cooler V2 multi-delegation of voting power.
 * Reads current delegations from the MonoCooler contract and applies
 * delta-based changes via applyDelegations().
 */
export function CoolerDelegationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address } = useAccount();
  const { position } = useMonoCoolerPosition();
  const { delegations, delegationsLoading, applyDelegations, isPending, isSuccess, reset } =
    useMonoCoolerDelegations();

  const [entries, setEntries] = useState<DelegationEntry[]>([createEmptyEntry()]);
  const [initialDelegations, setInitialDelegations] = useState<Map<string, string>>(new Map());

  const maxEntries = position ? Number(position.maxDelegateAddresses) : 10;

  const availableCollateral = position ? Number(formatUnits(position.collateral, 18)) : 0;

  // Populate form with current delegations when they load
  useEffect(() => {
    if (delegations && delegations.length > 0) {
      const currentEntries = delegations.map((d) => ({
        address: d.delegate,
        amount: formatUnits(d.amount, 18),
      }));
      setEntries(currentEntries);

      const initialMap = new Map(
        delegations.map((d) => [d.delegate.toLowerCase(), formatUnits(d.amount, 18)]),
      );
      setInitialDelegations(initialMap);
    }
  }, [delegations]);

  const totalDelegationAmount = useMemo(() => {
    return entries.reduce((sum, input) => {
      if (!input.amount || isNaN(Number(input.amount))) return sum;
      return sum + Number(input.amount);
    }, 0);
  }, [entries]);

  // Check if current state differs from on-chain state
  const hasStateChanged = useMemo(() => {
    const currentMap = new Map(
      entries
        .filter((e) => e.address && e.amount && !isNaN(Number(e.amount)))
        .map((e) => [e.address.toLowerCase(), e.amount]),
    );

    if (currentMap.size !== initialDelegations.size) return true;

    for (const [addr, amount] of currentMap) {
      const initial = initialDelegations.get(addr);
      if (!initial || initial !== amount) return true;
    }

    for (const addr of initialDelegations.keys()) {
      if (!currentMap.has(addr)) return true;
    }

    return false;
  }, [entries, initialDelegations]);

  const isValid = useMemo(() => {
    // Allow complete undelegation (all empty)
    const hasInitial = initialDelegations.size > 0;
    const allEmpty = entries.every((e) => !e.address && !e.amount);
    if (hasInitial && allEmpty) return true;

    if (totalDelegationAmount > availableCollateral) return false;

    // Check for duplicate addresses
    const addresses = new Set<string>();
    for (const entry of entries) {
      if (entry.address) {
        const lower = entry.address.toLowerCase();
        if (addresses.has(lower)) return false;
        addresses.add(lower);
      }
    }

    return entries.every((entry) => {
      if (!entry.address && !entry.amount) return true;
      if (entry.address || entry.amount) {
        if (!entry.address || !entry.amount) return false;
        if (!isAddress(entry.address)) return false;
        if (isNaN(Number(entry.amount)) || Number(entry.amount) <= 0) return false;
      }
      return true;
    });
  }, [entries, totalDelegationAmount, availableCollateral, initialDelegations]);

  function handleClose() {
    // Reset to on-chain state
    if (delegations && delegations.length > 0) {
      setEntries(
        delegations.map((d) => ({
          address: d.delegate,
          amount: formatUnits(d.amount, 18),
        })),
      );
    } else {
      setEntries([createEmptyEntry()]);
    }
    reset();
    onClose();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) handleClose();
  }

  function updateEntry(index: number, field: keyof DelegationEntry, value: string) {
    // Prevent duplicate addresses
    if (field === "address" && value) {
      const lower = value.toLowerCase();
      const isDuplicate = entries.some((e, i) => i !== index && e.address.toLowerCase() === lower);
      if (isDuplicate) return;
    }

    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addEntry() {
    if (entries.length >= maxEntries) return;
    setEntries((prev) => [...prev, createEmptyEntry()]);
  }

  function removeEntry(index: number) {
    setEntries((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [createEmptyEntry()] : next;
    });
  }

  function handleSetToMyWallet() {
    if (!address || !position) return;
    setEntries([
      {
        address: address,
        amount: formatUnits(position.collateral, 18),
      },
    ]);
  }

  function handleApplyDelegations() {
    if (!isValid || !delegations) return;

    const requests = computeDelegationDeltas(delegations, entries);
    if (requests.length === 0) return;

    applyDelegations(requests);
  }

  const exceedsCollateral = totalDelegationAmount > availableCollateral;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Cooler V2 Delegations</DialogTitle>
          <DialogDescription>
            Delegate your Cooler V2 collateral voting power to up to {maxEntries} unique addresses.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Info Banner */}
          <div className="rounded-lg bg-blue-500/10 px-3 py-2.5 text-xs text-blue-400">
            You can delegate to up to {maxEntries} unique addresses. The total delegated amount
            cannot exceed your available collateral.
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-1.5 rounded-lg bg-surface-a3 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary-t">Available Collateral</span>
              <span className="text-sm font-semibold text-primary-t">
                {delegationsLoading ? "..." : `${availableCollateral.toFixed(4)} gOHM`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary-t">Total Delegation Amount</span>
              <span
                className={`text-sm font-semibold ${exceedsCollateral ? "text-red-400" : "text-primary-t"}`}
              >
                {totalDelegationAmount.toFixed(4)} gOHM
              </span>
            </div>
          </div>

          {exceedsCollateral && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
              Total delegation exceeds available collateral.
            </div>
          )}

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
                  disabled={entries.length <= 1 && !entry.address && !entry.amount}
                  className="mt-2 text-tertiary-t hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Entry */}
          {entries.length < maxEntries && (
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors self-start"
            >
              <Plus className="size-3.5" />
              Add Additional Delegation Address
            </button>
          )}

          {isSuccess ? (
            <div className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400 text-center">
              Delegations updated successfully!
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSetToMyWallet}
                disabled={!address || !position}
                className="shrink-0"
              >
                Set to My Wallet
              </Button>
              <Button
                onClick={handleApplyDelegations}
                disabled={!isValid || isPending || !hasStateChanged}
                className="flex-1"
              >
                {isPending ? "Delegating..." : "Delegate Voting"}
              </Button>
            </div>
          )}

          <span className="text-[11px] text-tertiary-t text-center">
            {entries.length} of {maxEntries} delegations
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
