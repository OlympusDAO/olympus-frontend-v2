import { describe, expect, it } from "vitest";
import { mergeHistory, summarizeHistorySources, toCcipRow } from "../mergeHistory";
import type { BridgeHistoryItem } from "../useBridgeHistory";
import type { TrackedTransfer } from "../trackedTransfers";

const MESSAGE_ID = `0x${"ab".repeat(32)}` as const;

const ccipRow: BridgeHistoryItem = {
  source: "ccip",
  srcChainId: 1,
  dstChainId: 42161,
  timestamp: "2026-11-01T10:00:00.000Z",
  amount: "1",
  srcTxHash: "0xccip",
  status: "DELIVERED",
  messageId: MESSAGE_ID,
};

const layerZeroRow: BridgeHistoryItem = {
  ...ccipRow,
  source: "layerzero",
  messageId: undefined,
  srcTxHash: "0xlz",
  timestamp: "2026-11-01T12:00:00.000Z",
};

const tracked: TrackedTransfer = {
  srcChainId: 1,
  dstChainId: 42161,
  amount: "5",
  srcTxHash: "0xtracked",
  messageId: `0x${"cd".repeat(32)}`,
  timestamp: "2026-11-01T11:00:00.000Z",
  address: "0x00000000000000000000000000000000000000c1",
};

describe("mergeHistory", () => {
  it("sorts newest first across sources", () => {
    expect(mergeHistory([ccipRow], [tracked], [layerZeroRow]).map((r) => r.srcTxHash)).toEqual([
      "0xlz",
      "0xtracked",
      "0xccip",
    ]);
  });

  it("shows a tracked transfer as in flight until the API has it", () => {
    const [row] = mergeHistory([], [tracked], []);
    expect(row).toMatchObject({ source: "ccip", status: "INFLIGHT", amount: "5" });
  });

  it("drops a tracked transfer once an API row has its message ID", () => {
    const rows = mergeHistory([ccipRow], [{ ...tracked, messageId: MESSAGE_ID }], []);
    expect(rows).toEqual([ccipRow]);
  });

  it("drops a tracked transfer without a message ID once an API row has its tx", () => {
    const rows = mergeHistory(
      [ccipRow],
      [{ ...tracked, messageId: undefined, srcTxHash: "0xCCIP" }],
      [],
    );
    expect(rows).toEqual([ccipRow]);
  });
});

describe("toCcipRow", () => {
  const message = {
    messageId: MESSAGE_ID,
    sender: "0xbridge",
    origin: "0xwallet",
    status: "SUCCESS",
    readyForManualExecution: false,
    sourceNetworkInfo: { chainId: "1", chainSelector: "1" },
    destNetworkInfo: { chainId: "42161", chainSelector: "2" },
    sendTransactionHash: "0xsend",
    sendTimestamp: "2026-11-01T10:00:00.000Z",
    receiptTransactionHash: "0xreceipt",
    sourceTokenAmount: { tokenAddress: "0xohm", tokenAmount: "2000000000" },
  };

  it("maps a delivered message", () => {
    expect(toCcipRow(message, false)).toEqual({
      source: "ccip",
      srcChainId: 1,
      dstChainId: 42161,
      timestamp: "2026-11-01T10:00:00.000Z",
      amount: "2",
      srcTxHash: "0xsend",
      dstTxHash: "0xreceipt",
      status: "DELIVERED",
      messageId: MESSAGE_ID,
    });
  });

  it("needs a retry when the bridge stored a failure", () => {
    expect(toCcipRow(message, true).status).toBe("NEEDS_RETRY");
  });

  it("doesn't claim delivery when the bridge couldn't be read", () => {
    expect(toCcipRow(message, undefined).status).toBe("INFLIGHT");
  });

  it("leaves the amount empty rather than 0 when the API has none", () => {
    expect(toCcipRow({ ...message, sourceTokenAmount: null }, false).amount).toBeUndefined();
  });
});

describe("summarizeHistorySources", () => {
  const failed = new Error("down");

  it("flags a partial failure when only CCIP fails", () => {
    expect(summarizeHistorySources(failed, null)).toEqual({ error: null, partialError: true });
  });

  it("flags a partial failure when only LayerZero fails", () => {
    expect(summarizeHistorySources(null, failed)).toEqual({ error: null, partialError: true });
  });

  it("reports an error when both fail", () => {
    expect(summarizeHistorySources(failed, failed)).toEqual({ error: failed, partialError: false });
  });

  it("is clean when neither fails", () => {
    expect(summarizeHistorySources(null, null)).toEqual({ error: null, partialError: false });
  });
});
