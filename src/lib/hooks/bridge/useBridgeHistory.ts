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
import { fetchBridgeMessages, fetchMessage, filterByOrigin, type CcipMessage } from "./ccipApi";
import { mergeHistory, summarizeHistorySources, toCcipRow } from "./mergeHistory";
import { useTrackedTransfers } from "./trackedTransfers";
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
  return filterByOrigin(perChain.flat(), wallet);
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
