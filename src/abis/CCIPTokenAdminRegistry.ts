const CCIPTokenAdminRegistryAbi = [
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export default CCIPTokenAdminRegistryAbi;
