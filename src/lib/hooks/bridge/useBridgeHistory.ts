import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAccount, useChainId, useConfig } from "wagmi";
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
  filterByWallet,
  onBridgeChains,
  type CcipMessage,
} from "./ccipApi";
import { mergeHistory, summarizeHistorySources, toCcipRow } from "./mergeHistory";
import {
  fetchSafeExecutedTxs,
  fetchSafeNonce,
  fetchSafeQueuedBridgeTxs,
  fetchSafeTx,
  isFeeShort,
  isNotFound,
  resolveMissingProposal,
  resolveSafeTransfer,
  SAFE_SERVICE_SLUGS,
} from "./safeService";
import {
  addTrackedTransfer,
  removeTrackedTransfer,
  resolveTrackedTransfer,
  useTrackedTransfers,
} from "./trackedTransfers";
import { useLayerZeroHistory } from "./useLayerZeroHistory";
import { useSafeContext } from "./useSafeContext";

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
  safeTxHash?: Hex;
  safeProgress?: { confirmations: number; required: number; queueUrl: string };
  /** What a queued Safe proposal will send, to compare with the fee now. */
  safeSend?: { value: string; selector: bigint; recipient: Address; amount: bigint };
  /** A short explanation shown under the status. */
  note?: string;
}

/** All messages this wallet signed, across every source chain. */
async function fetchWalletMessages(
  wallet: Address,
  safeTxHashes: ReadonlySet<string>,
): Promise<CcipMessage[]> {
  const perChain = await Promise.all(
    BRIDGE_CHAINS.map(({ chainId }) => {
      const bridge = getContractAddress(ContractName.CCIP_BRIDGE, chainId);
      const selector = CCIP_CHAIN_SELECTORS[chainId];
      return bridge && selector !== undefined ? fetchBridgeMessages(bridge, selector) : [];
    }),
  );
  return onBridgeChains(filterByWallet(perChain.flat(), wallet, safeTxHashes));
}

/** Tracked messages the wallet filter missed. One the API doesn't have yet stays locally tracked. */
async function fetchMissingMessages(messageIds: Hex[]): Promise<CcipMessage[]> {
  const results = await Promise.allSettled(messageIds.map(fetchMessage));
  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

/** The Safe service's free quota is small, so it's read far less often than the CCIP API. */
const SAFE_POLL_INTERVAL = 5 * 60_000;

/** Merges CCIP, locally tracked and LayerZero transfers. A history failure never blocks bridging. */
export function useBridgeHistory() {
  const { address } = useAccount();
  const config = useConfig();
  const mock = useMockData();
  const tracked = useTrackedTransfers(address);
  const layerZero = useLayerZeroHistory();
  const walletChainId = useChainId();
  const { kind: walletKind } = useSafeContext(walletChainId);
  const isSafe = walletKind === "safe";

  const proposals = useMemo(
    () => tracked.filter((transfer) => transfer.safeTxHash && !transfer.srcTxHash),
    [tracked],
  );
  const proposalHashes = useMemo(() => proposals.map((t) => t.safeTxHash), [proposals]);

  // A Safe is one contract on one chain, so only the connected chain is read.
  const safeEnabled = !mock && !!address && isSafe && walletChainId in SAFE_SERVICE_SLUGS;
  const safeExecuted = useQuery({
    queryKey: ["bridgeHistory", "safeExecuted", address, walletChainId],
    enabled: safeEnabled,
    retry: false,
    staleTime: SAFE_POLL_INTERVAL,
    refetchInterval: SAFE_POLL_INTERVAL,
    queryFn: async () => {
      const executed = await fetchSafeExecutedTxs(walletChainId, address as Address);
      return executed.flatMap((tx) =>
        tx.transactionHash ? [tx.transactionHash.toLowerCase()] : [],
      );
    },
  });
  const safeTxHashes = safeExecuted.data;

  const safeQueued = useQuery({
    // Keyed on this browser's proposals, so a new one shows its signing progress straight away.
    queryKey: ["bridgeHistory", "safeQueued", address, walletChainId, proposalHashes],
    enabled: safeEnabled,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: SAFE_POLL_INTERVAL,
    refetchInterval: SAFE_POLL_INTERVAL,
    queryFn: async () => {
      const rows = await fetchSafeQueuedBridgeTxs(walletChainId, address as Address);
      const client = getPublicClient(config, { chainId: walletChainId });
      const bridge = getContractAddress(ContractName.CCIP_BRIDGE, walletChainId);
      if (!client || !bridge) return rows;

      // A proposal whose fee has risen past what it pays would fail at execution and sit in the
      // queue, blocking later Safe transactions, so say so rather than leave it Awaiting.
      return Promise.all(
        rows.map(async (row) => {
          if (!row.safeSend) return row;
          const { value, selector, recipient, amount } = row.safeSend;
          const fee = await client
            .readContract({
              address: bridge,
              abi: CCIPCrossChainBridgeAbi,
              functionName: "getFeeEVM",
              args: [selector, recipient, amount],
            })
            .catch(() => undefined);
          return fee !== undefined && isFeeShort(value, fee)
            ? { ...row, note: "Fee now above what this sends: replace it in your Safe" }
            : row;
        }),
      );
    },
  });

  // Follows this browser's Safe proposals until they execute, revert or get replaced.
  useQuery({
    queryKey: ["bridgeHistory", "resolveProposals", proposalHashes],
    enabled: !mock && proposals.length > 0,
    retry: false,
    refetchInterval: SAFE_POLL_INTERVAL,
    queryFn: async () => {
      await Promise.allSettled(
        proposals.map(async (transfer) => {
          const hash = transfer.safeTxHash as Hex;
          // The nonce comes first: read the other way round, a transaction executing in between
          // would look replaced and get dropped.
          const nonce = await fetchSafeNonce(transfer.srcChainId, transfer.address as Address);
          try {
            const resolution = resolveSafeTransfer(
              await fetchSafeTx(transfer.srcChainId, hash),
              nonce,
            );
            if (resolution.state === "replaced") removeTrackedTransfer(hash);
            if (resolution.state === "executed" || resolution.state === "reverted") {
              addTrackedTransfer({
                ...transfer,
                srcTxHash: resolution.hash,
                failed: resolution.state === "reverted",
              });
            }
          } catch (error) {
            if (!isNotFound(error)) return;
            const receipt = await getPublicClient(config, { chainId: transfer.srcChainId })
              ?.getTransactionReceipt({ hash })
              .catch(() => undefined);
            const age = Date.now() - new Date(transfer.timestamp).getTime();
            const outcome = resolveMissingProposal(!!receipt, age);
            if (outcome === "drop") removeTrackedTransfer(hash);
            if (outcome === "promote") {
              addTrackedTransfer({ ...transfer, srcTxHash: hash, safeTxHash: undefined });
            }
          }
        }),
      );
      return null;
    },
  });

  const trackedIds = useMemo(
    () => tracked.flatMap((transfer) => (transfer.messageId ? [transfer.messageId] : [])),
    [tracked],
  );

  // A send is recorded as soon as it has a hash, so the modal can close before its receipt. This
  // finds out what happened to those: failed ones go, and the rest get a message ID to follow.
  const unresolved = useMemo(
    () => tracked.filter((t) => t.srcTxHash && !t.messageId && !t.failed),
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
    queryKey: ["bridgeHistory", "ccip", address, trackedIds, safeTxHashes],
    // A Safe's messages can only be recognized once its execution hashes have loaded.
    enabled: !mock && !!address && (!isSafe || !safeExecuted.isLoading),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const found = await fetchWalletMessages(address as Address, new Set(safeTxHashes));
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
    () => mergeHistory(ccip.data ?? [], tracked, layerZero.data ?? [], safeQueued.data ?? []),
    [ccip.data, tracked, layerZero.data, safeQueued.data],
  );

  if (mock?.scenario.bridge) {
    return {
      history: mock.scenario.bridge.history,
      isLoading: false,
      error: mock.scenario.bridge.historyError ? new Error("History unavailable") : null,
      partialError: false,
    };
  }

  const sources = summarizeHistorySources(ccip.error, layerZero.error);

  return {
    history,
    isLoading: ccip.isLoading || layerZero.isLoading,
    error: sources.error,
    partialError:
      sources.partialError ||
      !!safeExecuted.error ||
      !!safeQueued.error ||
      walletKind === "unknown",
  };
}
