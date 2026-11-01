// Chainlink CCIP 1.6 token pool surface, limited to what the frontend uses. `isEnabled` exists only
// on the Olympus burn/mint pools, not on the mainnet lock/release pool.
const tokenBucket = {
  name: "",
  type: "tuple",
  components: [
    { name: "tokens", type: "uint128" },
    { name: "lastUpdated", type: "uint32" },
    { name: "isEnabled", type: "bool" },
    { name: "capacity", type: "uint128" },
    { name: "rate", type: "uint128" },
  ],
} as const;

const CCIPTokenPoolAbi = [
  {
    type: "function",
    name: "isEnabled",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isSupportedChain",
    stateMutability: "view",
    inputs: [{ name: "remoteChainSelector", type: "uint64" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getCurrentOutboundRateLimiterState",
    stateMutability: "view",
    inputs: [{ name: "remoteChainSelector", type: "uint64" }],
    outputs: [tokenBucket],
  },
  {
    type: "function",
    name: "getCurrentInboundRateLimiterState",
    stateMutability: "view",
    inputs: [{ name: "remoteChainSelector", type: "uint64" }],
    outputs: [tokenBucket],
  },
] as const;

export default CCIPTokenPoolAbi;
