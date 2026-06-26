import { useMemo, useSyncExternalStore } from "react";

/**
 * A locally-tracked bridge transaction that has confirmed on the source chain but may not yet
 * be indexed by LayerZero Scan. These are shown optimistically in the history as "In Flight"
 * until the LZ Scan record for the same source tx appears, at which point the optimistic entry
 * is dropped in favour of the real one.
 */
export interface PendingBridgeTx {
  srcChainId: number;
  dstChainId: number;
  amount: string;
  srcTxHash: string;
  timestamp: string;
  /** Wallet that submitted the transfer (for per-account filtering). */
  address: string;
}

const STORAGE_KEY = "olympus-pending-bridge-txs";
const EMPTY = "[]";

const listeners = new Set<() => void>();

function readRaw(): string {
  if (typeof window === "undefined") return EMPTY;
  return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY;
}

function readItems(): PendingBridgeTx[] {
  try {
    return JSON.parse(readRaw()) as PendingBridgeTx[];
  } catch {
    return [];
  }
}

function writeItems(items: PendingBridgeTx[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  for (const l of listeners) l();
}

/** Record a freshly-confirmed bridge transfer so it shows in history immediately. */
export function addPendingBridgeTx(tx: PendingBridgeTx): void {
  const existing = readItems().filter(
    (t) => t.srcTxHash.toLowerCase() !== tx.srcTxHash.toLowerCase(),
  );
  // Cap the list so it can't grow unbounded.
  writeItems([tx, ...existing].slice(0, 50));
}

/** Drop optimistic entries that LayerZero Scan now reports (matched by source tx hash). */
export function removePendingBridgeTxs(srcTxHashes: string[]): void {
  if (srcTxHashes.length === 0) return;
  const remove = new Set(srcTxHashes.map((h) => h.toLowerCase()));
  const items = readItems();
  const next = items.filter((t) => !remove.has(t.srcTxHash.toLowerCase()));
  if (next.length !== items.length) writeItems(next);
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** Reactive list of locally-tracked pending bridge transfers for the given wallet. */
export function usePendingBridgeTxs(address?: string): PendingBridgeTx[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => EMPTY);
  return useMemo(() => {
    let items: PendingBridgeTx[] = [];
    try {
      items = JSON.parse(raw) as PendingBridgeTx[];
    } catch {
      items = [];
    }
    if (!address) return items;
    return items.filter((t) => t.address.toLowerCase() === address.toLowerCase());
  }, [raw, address]);
}
