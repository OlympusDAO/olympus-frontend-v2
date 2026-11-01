import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics, type Address, type Hex, type Log } from "viem";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import { parseBridgedMessageId } from "../parseBridged";

const BRIDGE = "0x00000000000000000000000000000000000000a1" as Address;
const SENDER = "0x00000000000000000000000000000000000000c1" as Address;
const MESSAGE_ID = `0x${"ab".repeat(32)}` as Hex;

function bridgedLog(address: Address): Log {
  return {
    address,
    topics: encodeEventTopics({
      abi: CCIPCrossChainBridgeAbi,
      eventName: "Bridged",
      args: { sender: SENDER },
    }) as Log["topics"],
    data: encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint64" }, { type: "uint256" }, { type: "uint256" }],
      [MESSAGE_ID, 1n, 1_000_000_000n, 5n],
    ),
    blockHash: null,
    blockNumber: null,
    logIndex: null,
    transactionHash: null,
    transactionIndex: null,
    removed: false,
  };
}

describe("parseBridgedMessageId", () => {
  it("finds the message ID in the bridge's Bridged log", () => {
    expect(parseBridgedMessageId([bridgedLog(BRIDGE)], BRIDGE)).toBe(MESSAGE_ID);
  });

  it("ignores a Bridged log from another address", () => {
    const other = "0x00000000000000000000000000000000000000ff" as Address;
    expect(parseBridgedMessageId([bridgedLog(other)], BRIDGE)).toBeUndefined();
  });

  it("returns undefined with no matching log", () => {
    expect(parseBridgedMessageId([], BRIDGE)).toBeUndefined();
  });
});
