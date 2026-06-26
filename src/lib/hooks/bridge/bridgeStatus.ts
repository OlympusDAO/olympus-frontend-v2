/**
 * Shared classification of LayerZero Scan message statuses into the buckets the bridge UI
 * renders. Used by both the history list (`useBridgeHistory`) and the live confirm-modal
 * status (`useBridgeMessageStatus`) so the two never disagree about what a raw LZ status means.
 */
export type BridgeStatus = "DELIVERED" | "INFLIGHT" | "PENDING_RECOVERY" | "FAILED" | string;

/**
 * Raw LZ Scan status names for messages whose OHM is already burned on the source but is
 * stuck on the destination (blocked/stored) — retryable, e.g. receivable exceeded or receive
 * disabled. We surface these as PENDING_RECOVERY so users understand the OHM is not lost.
 */
export const RECOVERY_STATUS_NAMES = [
  "PAYLOAD_STORED",
  "BLOCKED",
  "APPLICATION_BURNED",
  "UNRESOLVABLE_COMMAND",
] as const;

/**
 * Classify a raw LayerZero status name (and optional delivered destination tx) into a
 * `BridgeStatus`. A delivered destination tx always wins.
 */
export function classifyLzStatus(statusName?: string, dstTxHash?: string): BridgeStatus {
  const name = (statusName ?? "").toUpperCase();
  if (name === "DELIVERED" || dstTxHash) return "DELIVERED";
  if (name === "FAILED") return "FAILED";
  if ((RECOVERY_STATUS_NAMES as readonly string[]).includes(name)) return "PENDING_RECOVERY";
  return "INFLIGHT";
}

/**
 * Whether a raw LZ status is terminal for polling purposes — i.e. it will not progress on its
 * own (delivered, failed, or stuck pending manual recovery), so there's no point polling further.
 */
export function isTerminalLzStatus(statusName?: string, dstTxHash?: string): boolean {
  const status = classifyLzStatus(statusName, dstTxHash);
  return status === "DELIVERED" || status === "FAILED" || status === "PENDING_RECOVERY";
}
