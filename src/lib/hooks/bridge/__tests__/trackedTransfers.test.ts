import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import {
  addTrackedTransfer,
  readTrackedTransfers,
  type TrackedTransfer,
} from "../trackedTransfers";

const STORAGE_KEY = "olympus-tracked-bridge-transfers";
const WALLET = "0x00000000000000000000000000000000000000c1";

const transfer = (overrides: Partial<TrackedTransfer> = {}): TrackedTransfer => ({
  srcChainId: 1,
  dstChainId: 42161,
  amount: "1",
  srcTxHash: `0x${"a".repeat(64)}`,
  timestamp: "2026-11-01T00:00:00.000Z",
  address: WALLET,
  ...overrides,
});

describe("trackedTransfers", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("stores and reads a transfer for its wallet, ignoring address case", () => {
    addTrackedTransfer(transfer());
    expect(readTrackedTransfers(WALLET.toUpperCase().replace("0X", "0x"))).toHaveLength(1);
    expect(readTrackedTransfers("0x00000000000000000000000000000000000000ff")).toEqual([]);
  });

  it("replaces an entry with the same source tx", () => {
    addTrackedTransfer(transfer({ amount: "1" }));
    addTrackedTransfer(transfer({ amount: "2" }));
    expect(readTrackedTransfers(WALLET).map((t) => t.amount)).toEqual(["2"]);
  });

  it("caps the list at 50", () => {
    for (let i = 0; i < 55; i++) {
      addTrackedTransfer(transfer({ srcTxHash: `0x${String(i).padStart(64, "0")}` }));
    }
    expect(readTrackedTransfers(WALLET)).toHaveLength(50);
  });

  it("returns an empty list on corrupt storage", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(readTrackedTransfers(WALLET)).toEqual([]);
  });

  it("returns an empty list when storage holds the wrong shape", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 1 }));
    expect(readTrackedTransfers(WALLET)).toEqual([]);
  });

  it("doesn't throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readTrackedTransfers(WALLET)).toEqual([]);
    expect(() => addTrackedTransfer(transfer())).not.toThrow();
  });
});
