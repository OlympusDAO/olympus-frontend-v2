import { useEffect, useMemo, useState } from "react";
import { isAddress, formatUnits } from "viem";
import { formatTokenAmount } from "@/lib/math";
import { RiInformationLine, RiDeleteBinLine, RiAddLine } from "@remixicon/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GOHMTokenIcon } from "@/icons";
import { useAccount } from "wagmi";
import { mainnet } from "@/lib/chains";
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

function isDecimalInput(value: string) {
  return /^\d*\.?\d*$/.test(value);
}

export function CoolerDelegationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address } = useAccount();
  const { position } = useMonoCoolerPosition({ chainId: mainnet.id });
  const { delegations, delegationsLoading, applyDelegations, isPending, isSuccess, reset } =
    useMonoCoolerDelegations();

  const [entries, setEntries] = useState<DelegationEntry[]>([createEmptyEntry()]);
  const [initialDelegations, setInitialDelegations] = useState<Map<string, string>>(new Map());

  const maxEntries = position ? Number(position.maxDelegateAddresses) : 10;
  const totalCollateral = position ? formatTokenAmount(position.collateral) : 0;

  useEffect(() => {
    if (!delegations) return;

    if (delegations.length === 0) {
      setEntries([createEmptyEntry()]);
      setInitialDelegations(new Map());
      return;
    }

    const currentEntries = delegations.map((d) => ({
      address: d.delegate,
      amount: formatUnits(d.amount, 18),
    }));
    setEntries(currentEntries);

    const initialMap = new Map(
      delegations.map((d) => [d.delegate.toLowerCase(), formatUnits(d.amount, 18)]),
    );
    setInitialDelegations(initialMap);
  }, [delegations]);

  const totalDelegationAmount = useMemo(() => {
    return entries.reduce((sum, input) => {
      if (!input.amount || isNaN(Number(input.amount))) return sum;
      return sum + Number(input.amount);
    }, 0);
  }, [entries]);

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
    const hasInitial = initialDelegations.size > 0;
    const allEmpty = entries.every((e) => !e.address && !e.amount);
    if (hasInitial && allEmpty) return true;
    if (totalDelegationAmount > totalCollateral) return false;
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
  }, [entries, totalDelegationAmount, totalCollateral, initialDelegations]);

  function handleClose() {
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
    if (field === "address" && value) {
      const lower = value.toLowerCase();
      const isDuplicate = entries.some((e, i) => i !== index && e.address.toLowerCase() === lower);
      if (isDuplicate) return;
    }

    if (field === "amount" && !isDecimalInput(value)) return;

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

  const exceedsCollateral = totalDelegationAmount > totalCollateral;
  const remainingDelegationCapacity = Math.max(totalCollateral - totalDelegationAmount, 0);
  const hasNoRemainingCapacity = totalCollateral > 0 && remainingDelegationCapacity === 0;
  const isFullyDelegatedToWallet =
    !!address &&
    entries.length === 1 &&
    entries[0]?.address.toLowerCase() === address.toLowerCase() &&
    Number(entries[0]?.amount) === totalCollateral;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 gap-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl/6 font-semibold text-primary-t tracking-[0.2px]">
            Manage Cooler V2 Delegations
          </DialogTitle>
        </DialogHeader>

        {/* Info Alert */}
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue/10 border border-blue/5">
          <RiInformationLine className="size-5 text-blue shrink-0" />
          <p className="text-sm/5 font-semibold text-primary-t">
            You can split your Cooler voting power across up to {maxEntries} unique addresses. To
            add another delegate when fully allocated, reduce an existing delegation amount first.
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-a5-b pb-3 mb-3">
            <span className="text-sm/5 font-normal text-secondary-t">Total Collateral</span>
            <div className="flex items-center gap-1.5">
              <GOHMTokenIcon className="size-5" />
              <span className="text-sm/5 font-semibold text-primary-t">
                {delegationsLoading ? "..." : `${totalCollateral.toFixed(4)} gOHM`}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between border-b border-a5-b pb-3 mb-3">
            <span className="text-sm/5 font-normal text-secondary-t">Remaining to Delegate</span>
            <div className="flex items-center gap-1.5">
              <GOHMTokenIcon className="size-5" />
              <span className="text-sm/5 font-semibold text-primary-t">
                {delegationsLoading ? "..." : `${remainingDelegationCapacity.toFixed(4)} gOHM`}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm/5 font-normal text-secondary-t">Total Delegation Amount</span>
            <div className="flex items-center gap-1.5">
              <GOHMTokenIcon className="size-5" />
              <span
                className={`text-sm/5 font-semibold ${exceedsCollateral ? "text-red-400" : "text-primary-t"}`}
              >
                {totalDelegationAmount.toFixed(4)} gOHM
              </span>
            </div>
          </div>
        </div>

        {hasNoRemainingCapacity && !hasStateChanged && (
          <div className="rounded-2xl bg-surface-a3 border border-a5-b px-3 py-2 text-xs/4 text-secondary-t">
            Your full Cooler position is already delegated. Reduce an existing amount before adding
            another delegate.
          </div>
        )}

        {/* Delegation Entries */}
        <div className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <div key={index} className="flex items-start gap-2">
              <Input
                placeholder="Delegate Address"
                value={entry.address}
                onChange={(e) => updateEntry(index, "address", e.target.value)}
                className="flex-1"
              />
              <div className="relative w-32">
                <GOHMTokenIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 pointer-events-none" />
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0000"
                  value={entry.amount}
                  onChange={(e) => updateEntry(index, "amount", e.target.value)}
                  className="pl-10"
                />
              </div>
              <button
                type="button"
                onClick={() => removeEntry(index)}
                disabled={entries.length <= 1 && !entry.address && !entry.amount}
                className="flex items-center justify-center size-10 rounded-full bg-surface-a5 text-primary-t hover:bg-surface-a10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <RiDeleteBinLine className="size-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Entry + Counter */}
        <div className="flex items-center justify-between">
          {entries.length < maxEntries && remainingDelegationCapacity > 0 ? (
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-1 text-xs/4 font-semibold text-primary-t hover:text-blue transition-colors"
            >
              <RiAddLine className="size-4" />
              Add Additional Delegation Address
            </button>
          ) : hasNoRemainingCapacity ? (
            <span className="text-xs/4 text-secondary-t">
              Reduce an existing amount to add another delegate.
            </span>
          ) : (
            <span />
          )}
          <span className="text-xs/4 text-secondary-t">
            {entries.length} of {maxEntries} delegations
          </span>
        </div>

        {isSuccess ? (
          <div className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400 text-center">
            Delegations updated successfully!
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={handleSetToMyWallet}
              disabled={!address || !position || isFullyDelegatedToWallet}
            >
              {isFullyDelegatedToWallet ? "Fully Self Delegated" : "Set to My Wallet"}
            </Button>
            <Button
              onClick={handleApplyDelegations}
              disabled={!isValid || isPending || !hasStateChanged}
            >
              {isPending ? "Delegating..." : hasStateChanged ? "Delegate Voting" : "No Changes"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
