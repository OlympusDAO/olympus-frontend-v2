import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import type { Hex } from "viem";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import { ContractName, getContractAddress } from "@/lib/contracts";
import type { BridgeStatus } from "./bridgeStatus";
import { fetchMessage } from "./ccipApi";
import { toCcipRow } from "./mergeHistory";

const POLL_INTERVAL = 15_000;

/** Live delivery status for one message. In flight until the API has it, and delivery is proven. */
export function useBridgeMessageStatus(
  messageId: Hex | undefined,
  destinationChainId: number,
): BridgeStatus {
  const { data: message } = useQuery({
    queryKey: ["bridgeMessage", messageId],
    enabled: !!messageId,
    queryFn: () => fetchMessage(messageId as Hex),
    refetchInterval: (query) => (query.state.data?.status === "SUCCESS" ? false : POLL_INTERVAL),
    retry: false,
  });

  const { data: stored } = useReadContract({
    address: getContractAddress(ContractName.CCIP_BRIDGE, destinationChainId),
    abi: CCIPCrossChainBridgeAbi,
    functionName: "getFailedMessage",
    args: [messageId as Hex],
    chainId: destinationChainId,
    query: { enabled: message?.status === "SUCCESS", refetchInterval: POLL_INTERVAL },
  });

  if (!message) return "INFLIGHT";
  return toCcipRow(message, stored ? stored.sourceChainSelector !== 0n : undefined).status;
}
