import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import LZCrossChainBridgeAbi from "@/abis/LZCrossChainBridge";
import { chainIdToEid } from "@/modules/ohm/utils/constants";
import { useMockData } from "@/lib/mock/provider";
import { useBridgeHistory } from "./useBridgeHistory";

const OHM_DECIMALS = 9;
// Warn the user when the send amount uses up this fraction of the tightest live limit.
const NEAR_LIMIT_RATIO = 0.9;

/**
 * Pre-flight rate-limit checks for a bridge route.
 *
 * Each route has two independent 24h sliding-window limits that fail very differently:
 *  - sendable(dstEid) on the SOURCE chain — if exceeded, sendOhm reverts safely (nothing moves).
 *  - receivable(srcEid) on the DESTINATION chain — if exceeded, OHM is already burned and the
 *    message gets stuck pending recovery on the destination. This is the dangerous one.
 *
 * receivable only reflects already-delivered messages, so we additionally subtract OHM that is
 * in flight on this route (Sent without a matching Received). NOTE: this is sourced from the
 * connected wallet's LayerZero Scan history and is therefore wallet-scoped — it does not capture
 * concurrent sends from other wallets racing for the same capacity. We compensate by warning
 * whenever the amount approaches the live limit, not only when it provably exceeds it.
 */
export function useBridgeRateLimits({
  sourceChainId,
  destinationChainId,
  amount,
}: {
  sourceChainId: number;
  destinationChainId: number;
  amount: bigint;
}) {
  const mock = useMockData();

  const sourceFacilitator = getContractAddress(ContractName.LZ_CROSS_CHAIN_BRIDGE, sourceChainId);
  const destFacilitator = getContractAddress(
    ContractName.LZ_CROSS_CHAIN_BRIDGE,
    destinationChainId,
  );
  const srcEid = chainIdToEid(sourceChainId);
  const dstEid = chainIdToEid(destinationChainId);

  // Outbound capacity, read on the source chain.
  const { data: sendableData, isLoading: sendableLoading } = useReadContract({
    address: sourceFacilitator,
    abi: LZCrossChainBridgeAbi,
    functionName: "sendable",
    args: [dstEid!],
    chainId: sourceChainId,
    query: { enabled: !mock && !!sourceFacilitator && !!dstEid, refetchInterval: 30_000 },
  });

  // Inbound capacity, read cross-chain on the destination chain.
  const { data: receivableData, isLoading: receivableLoading } = useReadContract({
    address: destFacilitator,
    abi: LZCrossChainBridgeAbi,
    functionName: "receivable",
    args: [srcEid!],
    chainId: destinationChainId,
    query: { enabled: !mock && !!destFacilitator && !!srcEid, refetchInterval: 30_000 },
  });

  // Wallet-scoped in-flight on this route (Sent without a matching Received).
  const { history } = useBridgeHistory();
  const inFlightOnRoute = useMemo(() => {
    return history
      .filter(
        (item) =>
          item.srcChainId === sourceChainId &&
          item.dstChainId === destinationChainId &&
          item.status !== "DELIVERED" &&
          item.status !== "FAILED",
      )
      .reduce((sum, item) => {
        try {
          return sum + parseUnits(item.amount || "0", OHM_DECIMALS);
        } catch {
          return sum;
        }
      }, 0n);
  }, [history, sourceChainId, destinationChainId]);

  if (mock?.scenario.bridge) {
    return {
      sendableAvailable: undefined,
      receivableAvailable: undefined,
      adjustedReceivable: undefined,
      inFlightOnRoute: 0n,
      canSend: mock.scenario.bridge.isActive,
      isNearLimit: false,
      isLoading: false,
    };
  }

  const sendableAvailable = sendableData?.[1];
  const receivableAvailable = receivableData?.[1];

  const adjustedReceivable =
    receivableAvailable != null
      ? receivableAvailable > inFlightOnRoute
        ? receivableAvailable - inFlightOnRoute
        : 0n
      : undefined;

  // Tightest of the two live limits (after in-flight adjustment).
  const tightestLimit = (() => {
    if (sendableAvailable == null && adjustedReceivable == null) return undefined;
    if (sendableAvailable == null) return adjustedReceivable;
    if (adjustedReceivable == null) return sendableAvailable;
    return sendableAvailable < adjustedReceivable ? sendableAvailable : adjustedReceivable;
  })();

  const exceedsSendable = sendableAvailable != null && amount > sendableAvailable;
  const exceedsReceivable = adjustedReceivable != null && amount > adjustedReceivable;
  const canSend = amount <= 0n || (!exceedsSendable && !exceedsReceivable);

  const isNearLimit =
    amount > 0n &&
    canSend &&
    tightestLimit != null &&
    tightestLimit > 0n &&
    amount > (tightestLimit * BigInt(Math.round(NEAR_LIMIT_RATIO * 100))) / 100n;

  return {
    sendableAvailable,
    receivableAvailable,
    adjustedReceivable,
    inFlightOnRoute,
    canSend,
    isNearLimit,
    isLoading: sendableLoading || receivableLoading,
  };
}
