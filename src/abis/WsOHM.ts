// Legacy Olympus v1 wrapped sOHM (wsOHM, 0xCa76543Cf381ebBB277bE79574059e32108e3E65).
// Minimal ABI: unwrap wsOHM → sOHM v1 (no approval needed — burns the caller's own wsOHM).
export default [
  {
    inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
    name: "unwrap",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    // wsOHM (18 decimals) → sOHM v1 (9 decimals). Not 1:1 — scaled by the gOHM index.
    inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
    name: "wOHMTosOHM",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
