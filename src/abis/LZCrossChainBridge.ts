// LayerZero V2 OHM bridge facilitator (LZCrossChainBridge).
// User-facing periphery contract: OHM is approved to this contract, which transfers
// it to the gateway for burn-and-send. Derived from ILZCrossChainBridge + IEnabler.
export default [
  {
    inputs: [],
    name: "isEnabled",
    outputs: [{ internalType: "bool", name: "enabled", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint32", name: "dstEid_", type: "uint32" },
      { internalType: "address", name: "to_", type: "address" },
      { internalType: "uint256", name: "amount_", type: "uint256" },
    ],
    name: "sendOhm",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint32", name: "dstEid_", type: "uint32" },
      { internalType: "address", name: "to_", type: "address" },
      { internalType: "uint256", name: "amount_", type: "uint256" },
    ],
    name: "estimateSendFee",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "nativeFee", type: "uint256" },
          { internalType: "uint256", name: "lzTokenFee", type: "uint256" },
        ],
        internalType: "struct MessagingFee",
        name: "fee",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint32", name: "dstEid_", type: "uint32" }],
    name: "sendable",
    outputs: [
      { internalType: "uint256", name: "inFlight", type: "uint256" },
      { internalType: "uint256", name: "available", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint32", name: "srcEid_", type: "uint32" }],
    name: "receivable",
    outputs: [
      { internalType: "uint256", name: "inFlight", type: "uint256" },
      { internalType: "uint256", name: "available", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "gateway",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OHM",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: true, internalType: "uint32", name: "dstEid", type: "uint32" },
      { indexed: false, internalType: "uint256", name: "nativeFee", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "msgValue", type: "uint256" },
    ],
    name: "Bridged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "gateway", type: "address" }],
    name: "GatewaySet",
    type: "event",
  },
  { anonymous: false, inputs: [], name: "Enabled", type: "event" },
  { anonymous: false, inputs: [], name: "Disabled", type: "event" },
] as const;
