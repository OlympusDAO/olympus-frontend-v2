import type { Hex } from "viem";
import { classifyCcipStatus } from "./bridgeStatus";
import { getCcipAmount, type CcipMessage } from "./ccipApi";
import type { TrackedTransfer } from "./trackedTransfers";
import type { BridgeHistoryItem } from "./useBridgeHistory";

/**
 * Converts a CCIP message to a history row. `storedFailure` is what the destination bridge reported,
 * undefined if it couldn't be read: CCIP's SUCCESS can't be called delivered without that read.
 */
export function toCcipRow(
  message: CcipMessage,
  storedFailure: boolean | undefined,
): BridgeHistoryItem {
  const status =
    message.status === "SUCCESS" && storedFailure === undefined
      ? "INFLIGHT"
      : classifyCcipStatus(message, storedFailure);

  return {
    source: "ccip",
    srcChainId: Number(message.sourceNetworkInfo.chainId),
    dstChainId: Number(message.destNetworkInfo.chainId),
    timestamp: message.sendTimestamp,
    amount: getCcipAmount(message),
    srcTxHash: message.sendTransactionHash,
    dstTxHash: message.receiptTransactionHash ?? undefined,
    status,
    messageId: message.messageId,
  };
}

function trackedToRow(transfer: TrackedTransfer): BridgeHistoryItem {
  const row: BridgeHistoryItem = {
    source: "ccip",
    srcChainId: transfer.srcChainId,
    dstChainId: transfer.dstChainId,
    timestamp: transfer.timestamp,
    amount: transfer.amount,
    srcTxHash: transfer.srcTxHash ?? "",
    status: "INFLIGHT",
    messageId: transfer.messageId,
    safeTxHash: transfer.safeTxHash,
  };
  if (transfer.failed) {
    return { ...row, status: "FAILED", note: "Execution reverted, propose again" };
  }
  return transfer.safeTxHash && !transfer.srcTxHash
    ? { ...row, status: "AWAITING_SIGNATURES" }
    : row;
}

const normalize = (value?: string) => value?.toLowerCase();

/** One newest-first list. API rows win over locally tracked ones for the same transfer. */
export function mergeHistory(
  ccip: BridgeHistoryItem[],
  tracked: TrackedTransfer[],
  layerZero: BridgeHistoryItem[],
  safeQueued: BridgeHistoryItem[] = [],
): BridgeHistoryItem[] {
  const messageIds = new Set<Hex | undefined>(ccip.map((row) => row.messageId));
  const txHashes = new Set(ccip.map((row) => normalize(row.srcTxHash)));
  const safeHashes = new Set(safeQueued.map((row) => normalize(row.safeTxHash)));

  const pending = tracked
    .filter(
      (transfer) =>
        !(transfer.messageId && messageIds.has(transfer.messageId)) &&
        !(transfer.srcTxHash && txHashes.has(normalize(transfer.srcTxHash))) &&
        !(transfer.safeTxHash && safeHashes.has(normalize(transfer.safeTxHash))),
    )
    .map(trackedToRow);

  return [...ccip, ...pending, ...layerZero, ...safeQueued].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function summarizeHistorySources(
  ccipError: Error | null,
  layerZeroError: Error | null,
): { error: Error | null; partialError: boolean } {
  if (ccipError && layerZeroError) return { error: ccipError, partialError: false };
  return { error: null, partialError: !!(ccipError || layerZeroError) };
}
