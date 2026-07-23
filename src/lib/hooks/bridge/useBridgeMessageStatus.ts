import { useQuery } from "@tanstack/react-query";
import { LZ_SCAN_API_BASE } from "@/modules/ohm/utils/constants";
import { useMockData } from "@/lib/mock/provider";
import { classifyLzStatus, isTerminalLzStatus, type BridgeStatus } from "./bridgeStatus";

export interface BridgeMessageStatus {
  /** LayerZero status name, e.g. INFLIGHT / DELIVERED / CONFIRMING / PAYLOAD_STORED. */
  status: string;
  /** Destination chain transaction hash once the message has been delivered. */
  dstTxHash?: string;
  guid?: string;
}

/**
 * Track the live cross-chain delivery status of a bridge transaction via LayerZero Scan
 * (`GET /v1/messages/tx/{txHash}`). Polls until the message is delivered or fails.
 *
 * Newly-submitted messages take a few seconds to be indexed, so a 404 / empty response is
 * treated as "still in flight" rather than an error.
 */
export function useBridgeMessageStatus(txHash?: string) {
  const mock = useMockData();

  const { data, isLoading } = useQuery<BridgeMessageStatus | null>({
    queryKey: ["bridgeMessageStatus", txHash],
    enabled: !mock && !!txHash,
    queryFn: async () => {
      const res = await fetch(`${LZ_SCAN_API_BASE}/messages/tx/${txHash}`);
      if (!res.ok) return null; // not indexed yet
      const json = await res.json();
      const msg = json.data?.[0];
      if (!msg) return null;
      return {
        status: msg.status?.name ?? "INFLIGHT",
        dstTxHash: msg.destination?.tx?.txHash ?? undefined,
        guid: msg.guid,
      };
    },
    // Poll every 5s until the message reaches a terminal state (delivered, failed, or stuck
    // pending recovery — none of which progress on their own).
    refetchInterval: (query) => {
      const data = query.state.data;
      return isTerminalLzStatus(data?.status, data?.dstTxHash) ? false : 5_000;
    },
  });

  // Classified status, consistent with the history list's buckets.
  const bridgeStatus: BridgeStatus | undefined =
    data != null ? classifyLzStatus(data.status, data.dstTxHash) : undefined;

  return {
    status: data?.status,
    bridgeStatus,
    dstTxHash: data?.dstTxHash,
    guid: data?.guid,
    isDelivered: bridgeStatus === "DELIVERED",
    isLoading,
  };
}
