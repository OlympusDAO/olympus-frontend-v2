import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { formatUnits, decodeAbiParameters } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { BRIDGE_NETWORKS, eidToChainId, LZ_SCAN_API_BASE } from "@/modules/ohm/utils/constants";
import { useMockData } from "@/lib/mock/provider";
import { usePendingBridgeTxs, removePendingBridgeTxs } from "./usePendingBridgeTxs";
import { classifyLzStatus, type BridgeStatus } from "./bridgeStatus";

export type { BridgeStatus };

export interface BridgeHistoryItem {
  srcChainId: number;
  dstChainId: number;
  timestamp: string;
  amount: string;
  srcTxHash: string;
  dstTxHash?: string;
  guid?: string;
  status: BridgeStatus;
}

function lzEidToEvmChainId(eid: number): number {
  return eidToChainId(eid) ?? eid;
}

/**
 * Fetch bridge history from the LayerZero Scan API.
 * Uses GET /v1/messages/wallet/{srcAddress}. Filters to OHM bridge gateway (OApp) messages
 * for the active environment.
 */
export function useBridgeHistory() {
  const { address } = useAccount();
  const mock = useMockData();

  // The LZ Scan pathway sender is the OApp — i.e. the gateway — so we filter on gateway addresses.
  const gatewayAddresses = BRIDGE_NETWORKS.map((chain) =>
    getContractAddress(ContractName.LZ_BRIDGE_GATEWAY, chain.chainId),
  ).filter(Boolean);

  const { data, isLoading, error } = useQuery({
    queryKey: ["bridgeHistory", address],
    enabled: !mock && !!address && gatewayAddresses.length > 0,
    queryFn: async () => {
      const url = `${LZ_SCAN_API_BASE}/messages/wallet/${address}?limit=100`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`LayerZero API error: ${response.status}`);
      }

      const json = await response.json();
      const messages: LzMessage[] = json.data ?? [];

      const gatewaySet = new Set(gatewayAddresses.map((a) => a!.toLowerCase()));

      const items: BridgeHistoryItem[] = messages
        .filter((msg) => {
          const senderAddr = msg.pathway?.sender?.address?.toLowerCase();
          return senderAddr && gatewaySet.has(senderAddr);
        })
        .map((msg) => {
          const srcChainId = lzEidToEvmChainId(msg.pathway.srcEid);
          const dstChainId = lzEidToEvmChainId(msg.pathway.dstEid);

          return {
            srcChainId,
            dstChainId,
            timestamp: msg.created,
            amount: parseAmountFromPayload(msg.source?.tx?.payload),
            srcTxHash: msg.source?.tx?.txHash ?? "",
            dstTxHash: msg.destination?.tx?.txHash ?? undefined,
            guid: msg.guid,
            status: deriveStatus(msg),
          } satisfies BridgeHistoryItem;
        });

      return items;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Optimistic entries for transfers confirmed on-chain but not yet indexed by LZ Scan.
  const pending = usePendingBridgeTxs(address);

  // Once LZ Scan reports a tx, drop its optimistic placeholder.
  useEffect(() => {
    if (!data) return;
    const lzHashes = new Set(data.map((i) => i.srcTxHash.toLowerCase()));
    const indexed = pending
      .filter((p) => lzHashes.has(p.srcTxHash.toLowerCase()))
      .map((p) => p.srcTxHash);
    removePendingBridgeTxs(indexed);
  }, [data, pending]);

  const history = useMemo(() => {
    const lzItems = data ?? [];
    const lzHashes = new Set(lzItems.map((i) => i.srcTxHash.toLowerCase()));
    const optimistic: BridgeHistoryItem[] = pending
      .filter((p) => !lzHashes.has(p.srcTxHash.toLowerCase()))
      .map((p) => ({
        srcChainId: p.srcChainId,
        dstChainId: p.dstChainId,
        timestamp: p.timestamp,
        amount: p.amount,
        srcTxHash: p.srcTxHash,
        status: "INFLIGHT" as BridgeStatus,
      }));
    return [...optimistic, ...lzItems];
  }, [data, pending]);

  if (mock?.scenario.bridge) {
    return {
      history: mock.scenario.bridge.history,
      isLoading: false,
      error: null,
    };
  }

  return {
    history,
    isLoading,
    error: error as Error | null,
  };
}

/** Derive a UI status from a LayerZero Scan message (see `classifyLzStatus`). */
function deriveStatus(msg: LzMessage): BridgeStatus {
  return classifyLzStatus(msg.status?.name, msg.destination?.tx?.txHash);
}

/**
 * Parse the OHM amount from a LayerZero V2 message payload.
 * V2 encodes `abi.encode(uint8 msgType, abi.encode(address to, uint256 amount))`:
 * decode the outer (uint8, bytes), then the inner (address, uint256). OHM has 9 decimals.
 */
function parseAmountFromPayload(payload?: string): string {
  if (!payload) return "0";
  try {
    const hexPayload = (payload.startsWith("0x") ? payload : `0x${payload}`) as `0x${string}`;
    const [, inner] = decodeAbiParameters(
      [
        { name: "msgType", type: "uint8" },
        { name: "inner", type: "bytes" },
      ],
      hexPayload,
    );
    const [, amount] = decodeAbiParameters(
      [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      inner as `0x${string}`,
    );
    if (amount === 0n) return "0";
    return formatUnits(amount, 9);
  } catch {
    return "0";
  }
}

// Type for LayerZero Scan API response messages
interface LzMessage {
  pathway: {
    srcEid: number;
    dstEid: number;
    sender: { address: string; id?: string; name?: string; chain?: string };
    receiver: { address: string; id?: string; name?: string; chain?: string };
    nonce: number;
  };
  source: {
    status: string;
    tx: {
      txHash: string;
      blockNumber: string;
      blockTimestamp: number;
      from: string;
      payload: string;
    };
  };
  destination?: {
    status?: string;
    tx?: {
      txHash: string;
      blockNumber?: string;
      blockTimestamp?: number;
    };
  };
  status: {
    name: string;
    message?: string;
  };
  guid: string;
  created: string;
  updated: string;
}
