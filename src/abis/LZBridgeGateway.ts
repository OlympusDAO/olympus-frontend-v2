// LayerZero V2 OHM bridge gateway (LZBridgeGateway).
// Policy that burns/mints OHM and handles LZ messaging. Source of Sent/Received
// events, rate-limit state, and bridged-supply reads. Derived from ILZBridgeGateway +
// IOffsettingRateLimiter + IEnablerV2. Only the members the frontend reads are included.
export default [
  {
    inputs: [],
    name: "isEnabled",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isReceiveEnabled",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint32", name: "dstEid_", type: "uint32" }],
    name: "outRateLimits",
    outputs: [
      { internalType: "uint256", name: "inFlight", type: "uint256" },
      { internalType: "uint256", name: "limit", type: "uint256" },
      { internalType: "uint32", name: "window", type: "uint32" },
      { internalType: "uint48", name: "lastUpdated", type: "uint48" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint32", name: "srcEid_", type: "uint32" }],
    name: "inRateLimits",
    outputs: [
      { internalType: "uint256", name: "inFlight", type: "uint256" },
      { internalType: "uint256", name: "limit", type: "uint256" },
      { internalType: "uint32", name: "window", type: "uint32" },
      { internalType: "uint48", name: "lastUpdated", type: "uint48" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "bridgedSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "IS_CANONICAL",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MSG_BRIDGE_OHM",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LZ_ENDPOINT",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ohm",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint32", name: "eid", type: "uint32" }],
    name: "peers",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: true, internalType: "uint32", name: "dstEid", type: "uint32" },
      { indexed: false, internalType: "bytes32", name: "guid", type: "bytes32" },
    ],
    name: "Sent",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: true, internalType: "uint32", name: "srcEid", type: "uint32" },
      { indexed: false, internalType: "bytes32", name: "guid", type: "bytes32" },
    ],
    name: "Received",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, internalType: "bool", name: "isReceiveEnabled", type: "bool" }],
    name: "IsReceiveEnabledSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "by", type: "address" },
      { indexed: true, internalType: "bool", name: "enable", type: "bool" },
      { indexed: false, internalType: "bytes", name: "data", type: "bytes" },
      { indexed: false, internalType: "uint48", name: "at", type: "uint48" },
    ],
    name: "Transition",
    type: "event",
  },
  { anonymous: false, inputs: [], name: "Enabled", type: "event" },
  { anonymous: false, inputs: [], name: "Disabled", type: "event" },
] as const;
