import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import {
  addTrackedTransfer,
  readTrackedTransfers,
  removeTrackedTransfer,
  resolveTrackedTransfer,
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

  it.each([
    ["null entries", [null]],
    ["number entries", [1]],
    ["entries with no address", [{ foo: 1 }]],
    ["an unparseable timestamp", [{ ...transfer(), timestamp: "not a date" }]],
  ])("drops %s rather than crashing", (_name, stored) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    expect(readTrackedTransfers(WALLET)).toEqual([]);
    expect(() => addTrackedTransfer(transfer())).not.toThrow();
  });

  it("keeps good entries alongside bad ones", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([null, transfer()]));
    expect(readTrackedTransfers(WALLET)).toHaveLength(1);
  });

  it("removes a proposal by its Safe hash", () => {
    const safeTxHash = `0x${"e".repeat(64)}` as const;
    addTrackedTransfer(transfer({ srcTxHash: undefined, safeTxHash }));
    removeTrackedTransfer(safeTxHash);
    expect(readTrackedTransfers(WALLET)).toEqual([]);
  });

  it("removes a transfer by source tx", () => {
    addTrackedTransfer(transfer());
    removeTrackedTransfer(transfer().srcTxHash as string);
    expect(readTrackedTransfers(WALLET)).toEqual([]);
  });
});

describe("resolveTrackedTransfer", () => {
  const BRIDGE = "0x00000000000000000000000000000000000000a1";

  it("is unresolved while there's no receipt", () => {
    expect(resolveTrackedTransfer(undefined, BRIDGE)).toEqual({ state: "pending" });
  });

  it("reports a reverted send so it can be dropped", () => {
    expect(resolveTrackedTransfer({ status: "reverted", logs: [] }, BRIDGE)).toEqual({
      state: "reverted",
    });
  });

  it("is sent with no message ID when the log is missing", () => {
    expect(resolveTrackedTransfer({ status: "success", logs: [] }, BRIDGE)).toEqual({
      state: "sent",
      messageId: undefined,
    });
  });
});
