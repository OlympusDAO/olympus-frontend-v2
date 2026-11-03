// Hand-authored from olympus-v3 src/periphery/interfaces/ICCIPCrossChainBridge.sol,
// limited to what the frontend uses.
const CCIPCrossChainBridgeAbi = [
  {
    type: "function",
    name: "isEnabled",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getFeeEVM",
    stateMutability: "view",
    inputs: [
      { name: "dstChainSelector_", type: "uint64" },
      { name: "to_", type: "address" },
      { name: "amount_", type: "uint256" },
    ],
    outputs: [{ name: "fee_", type: "uint256" }],
  },
  {
    type: "function",
    name: "sendToEVM",
    stateMutability: "payable",
    inputs: [
      { name: "dstChainSelector_", type: "uint64" },
      { name: "to_", type: "address" },
      { name: "amount_", type: "uint256" },
    ],
    outputs: [{ name: "messageId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "getTrustedRemoteEVM",
    stateMutability: "view",
    inputs: [{ name: "dstChainSelector_", type: "uint64" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "remoteAddress", type: "address" },
          { name: "isSet", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getGasLimit",
    stateMutability: "view",
    inputs: [{ name: "dstChainSelector_", type: "uint64" }],
    outputs: [{ name: "", type: "uint32" }],
  },
  {
    type: "function",
    name: "getFailedMessage",
    stateMutability: "view",
    inputs: [{ name: "messageId_", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "messageId", type: "bytes32" },
          { name: "sourceChainSelector", type: "uint64" },
          { name: "sender", type: "bytes" },
          { name: "data", type: "bytes" },
          {
            name: "destTokenAmounts",
            type: "tuple[]",
            components: [
              { name: "token", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "retryFailedMessage",
    stateMutability: "nonpayable",
    inputs: [{ name: "messageId_", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "event",
    name: "Bridged",
    inputs: [
      { name: "messageId", type: "bytes32", indexed: false },
      { name: "destinationChainSelector", type: "uint64", indexed: false },
      { name: "sender", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "fees", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MessageFailed",
    inputs: [{ name: "messageId", type: "bytes32", indexed: false }],
  },
] as const;

export default CCIPCrossChainBridgeAbi;
