export default [
  {
    inputs: [],
    name: "bridgeActive",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint16", name: "dstChainId_", type: "uint16" },
      { internalType: "address", name: "to_", type: "address" },
      { internalType: "uint256", name: "amount_", type: "uint256" },
      { internalType: "bytes", name: "adapterParams_", type: "bytes" },
    ],
    name: "estimateSendFee",
    outputs: [
      { internalType: "uint256", name: "nativeFee", type: "uint256" },
      { internalType: "uint256", name: "zroFee", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint16", name: "dstChainId_", type: "uint16" },
      { internalType: "address", name: "to_", type: "address" },
      { internalType: "uint256", name: "amount_", type: "uint256" },
    ],
    name: "sendOhm",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender_", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount_", type: "uint256" },
      { indexed: true, internalType: "uint16", name: "dstChain_", type: "uint16" },
    ],
    name: "BridgeTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "receiver_", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount_", type: "uint256" },
      { indexed: true, internalType: "uint16", name: "srcChain_", type: "uint16" },
    ],
    name: "BridgeReceived",
    type: "event",
  },
] as const;
