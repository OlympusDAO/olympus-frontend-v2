import { parseEventLogs, type Address, type Hex, type Log } from "viem";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";

/** Finds the CCIP message ID in the `Bridged` log the bridge emitted, if any. */
export function parseBridgedMessageId(logs: Log[], bridgeAddress: Address): Hex | undefined {
  const events = parseEventLogs({
    abi: CCIPCrossChainBridgeAbi,
    eventName: "Bridged",
    logs,
  });
  return events.find((e) => e.address.toLowerCase() === bridgeAddress.toLowerCase())?.args
    .messageId;
}
