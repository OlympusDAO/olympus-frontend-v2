import { useMemo, useSyncExternalStore } from "react";
import type { Hex } from "viem";

/**
 * A transfer this browser sent, kept so it shows immediately and stays visible for wallets the API's
 * origin filter can't match. localStorage can be corrupt or blocked; then tracking is simply lost.
 */
export interface TrackedTransfer {
  srcChainId: number;
  dstChainId: number;
  amount: string;
  srcTxHash?: string;
  messageId?: Hex;
  /** Set for a Safe proposal, which has no on-chain hash until it's executed. */
  safeTxHash?: Hex;
  timestamp: string;
  /** The wallet that sent it. */
  address: string;
}

const STORAGE_KEY = "olympus-tracked-bridge-transfers";
const MAX_ENTRIES = 50;
const EMPTY = "[]";

const listeners = new Set<() => void>();

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function parse(raw: string): TrackedTransfer[] {
  try {
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function forWallet(items: TrackedTransfer[], address: string): TrackedTransfer[] {
  const target = address.toLowerCase();
  return items.filter((item) => item.address.toLowerCase() === target);
}

export function readTrackedTransfers(address: string): TrackedTransfer[] {
  return forWallet(parse(readRaw()), address);
}

function sameTransfer(a: TrackedTransfer, b: TrackedTransfer): boolean {
  const matches = (x?: string, y?: string) => !!x && !!y && x.toLowerCase() === y.toLowerCase();
  return matches(a.srcTxHash, b.srcTxHash) || matches(a.safeTxHash, b.safeTxHash);
}

export function addTrackedTransfer(transfer: TrackedTransfer): void {
  const others = parse(readRaw()).filter((item) => !sameTransfer(item, transfer));
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([transfer, ...others].slice(0, MAX_ENTRIES)),
    );
  } catch {
    return;
  }
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTrackedTransfers(address?: string): TrackedTransfer[] {
  const raw = useSyncExternalStore(subscribe, readRaw);
  return useMemo(() => (address ? forWallet(parse(raw), address) : []), [raw, address]);
}
