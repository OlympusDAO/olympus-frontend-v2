import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAccount, useConfig } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import type { Address, Hex } from "viem";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { useMockData } from "@/lib/mock/provider";
import { BRIDGE_CHAINS, CCIP_CHAIN_SELECTORS } from "@/modules/ohm/utils/constants";
import type { BridgeStatus } from "./bridgeStatus";
import {
  fetchBridgeMessages,
  fetchMessage,
  filterByOrigin,
  onBridgeChains,
  type CcipMessage,
} from "./ccipApi";
import { mergeHistory, summarizeHistorySources, toCcipRow } from "./mergeHistory";
import {
  addTrackedTransfer,
  removeTrackedTransfer,
  resolveTrackedTransfer,
  useTrackedTransfers,
} from "./trackedTransfers";
import { useLayerZeroHistory } from "./useLayerZeroHistory";

export interface BridgeHistoryItem {
  source: "ccip" | "layerzero";
  srcChainId: number;
  dstChainId: number;
  timestamp: string;
  /** Undefined when the source doesn't report one. */
  amount?: string;
  srcTxHash: string;
  dstTxHash?: string;
  status: BridgeStatus;
  messageId?: Hex;
}

/** All messages this wallet signed, across every source chain. */
async function fetchWalletMessages(wallet: Address): Promise<CcipMessage[]> {
  const perChain = await Promise.all(
    BRIDGE_CHAINS.map(({ chainId }) => {
      const bridge = getContractAddress(ContractName.CCIP_BRIDGE, chainId);
      const selector = CCIP_CHAIN_SELECTORS[chainId];
      return bridge && selector !== undefined ? fetchBridgeMessages(bridge, selector) : [];
    }),
  );
  return onBridgeChains(filterByOrigin(perChain.flat(), wallet));
}

/** Tracked messages the wallet filter missed. One the API doesn't have yet stays locally tracked. */
async function fetchMissingMessages(messageIds: Hex[]): Promise<CcipMessage[]> {
  const results = await Promise.allSettled(messageIds.map(fetchMessage));
  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

/** Merges CCIP, locally tracked and LayerZero transfers. A history failure never blocks bridging. */
export function useBridgeHistory() {
  const { address } = useAccount();
  const config = useConfig();
  const mock = useMockData();
  const tracked = useTrackedTransfers(address);
  const layerZero = useLayerZeroHistory();

  const trackedIds = useMemo(
    () => tracked.flatMap((transfer) => (transfer.messageId ? [transfer.messageId] : [])),
    [tracked],
  );

  // A send is recorded as soon as it has a hash, so the modal can close before its receipt. This
  // finds out what happened to those: failed ones go, and the rest get a message ID to follow.
  const unresolved = useMemo(
    () => tracked.filter((transfer) => transfer.srcTxHash && !transfer.messageId),
    [tracked],
  );
  useQuery({
    queryKey: ["bridgeHistory", "resolveTracked", unresolved.map((t) => t.srcTxHash)],
    enabled: !mock && unresolved.length > 0,
    refetchInterval: 15_000,
    queryFn: async () => {
      await Promise.all(
        unresolved.map(async (transfer) => {
          const client = getPublicClient(config, { chainId: transfer.srcChainId });
          const bridge = getContractAddress(ContractName.CCIP_BRIDGE, transfer.srcChainId);
          if (!client || !bridge) return;
          const receipt = await client
            .getTransactionReceipt({ hash: transfer.srcTxHash as Hex })
            .catch(() => undefined);
          const resolution = resolveTrackedTransfer(receipt, bridge);
          if (resolution.state === "reverted") removeTrackedTransfer(transfer.srcTxHash as string);
          if (resolution.state === "sent" && resolution.messageId) {
            addTrackedTransfer({ ...transfer, messageId: resolution.messageId });
          }
        }),
      );
      return null;
    },
  });

  const ccip = useQuery({
    queryKey: ["bridgeHistory", "ccip", address, trackedIds],
    enabled: !mock && !!address,
    queryFn: async () => {
      const found = await fetchWalletMessages(address as Address);
      const foundIds = new Set(found.map((message) => message.messageId));
      const missing = await fetchMissingMessages(trackedIds.filter((id) => !foundIds.has(id)));
      const messages = [...found, ...missing];

      // CCIP's SUCCESS isn't proof of delivery, so ask each destination bridge.
      return Promise.all(
        messages.map(async (message) => {
          if (message.status !== "SUCCESS") return toCcipRow(message, false);
          const chainId = Number(message.destNetworkInfo.chainId);
          const bridge = getContractAddress(ContractName.CCIP_BRIDGE, chainId);
          const client = getPublicClient(config, { chainId });
          if (!bridge || !client) return toCcipRow(message, undefined);
          try {
            const stored = await client.readContract({
              address: bridge,
              abi: CCIPCrossChainBridgeAbi,
              functionName: "getFailedMessage",
              args: [message.messageId],
            });
            return toCcipRow(message, stored.sourceChainSelector !== 0n);
          } catch {
            return toCcipRow(message, undefined);
          }
        }),
      );
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const history = useMemo(
    () => mergeHistory(ccip.data ?? [], tracked, layerZero.data ?? []),
    [ccip.data, tracked, layerZero.data],
  );

  if (mock?.scenario.bridge) {
    return {
      history: mock.scenario.bridge.history,
      isLoading: false,
      error: mock.scenario.bridge.historyError ? new Error("History unavailable") : null,
      partialError: false,
    };
  }

  return {
    history,
    isLoading: ccip.isLoading || layerZero.isLoading,
    ...summarizeHistorySources(ccip.error, layerZero.error),
  };
}
