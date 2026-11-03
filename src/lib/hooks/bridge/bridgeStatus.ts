/** What the bridge UI shows for a transfer, whichever system carried it. */
export type BridgeStatus =
  | "DELIVERED"
  | "INFLIGHT"
  | "NEEDS_RETRY"
  | "NEEDS_RECOVERY"
  | "AWAITING_SIGNATURES"
  | "FAILED";

/**
 * Maps a CCIP message to a status. CCIP reporting SUCCESS doesn't prove the OHM arrived: the bridge
 * catches delivery errors and stores the message, leaving the OHM parked in the bridge until
 * someone calls `retryFailedMessage`, so `hasStoredFailure` comes from reading the destination.
 */
export function classifyCcipStatus(
  message: { status: string; readyForManualExecution: boolean },
  hasStoredFailure = false,
): BridgeStatus {
  if (message.status === "FAILED" || message.readyForManualExecution) return "NEEDS_RECOVERY";
  if (message.status === "SUCCESS") return hasStoredFailure ? "NEEDS_RETRY" : "DELIVERED";
  return "INFLIGHT";
}

const LAYER_ZERO_FAILED = new Set(["FAILED", "BLOCKED", "PAYLOAD_STORED"]);

export function classifyLayerZeroStatus(status: string): BridgeStatus {
  if (status === "DELIVERED") return "DELIVERED";
  return LAYER_ZERO_FAILED.has(status) ? "FAILED" : "INFLIGHT";
}
