export const iOracleAbi = [
  {
    type: "function",
    inputs: [],
    name: "getPrice",
    outputs: [{ name: "value", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  { type: "error", inputs: [], name: "Oracle__InvalidResponse" },
] as const;
