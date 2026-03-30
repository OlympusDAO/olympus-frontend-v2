export default [
  {
    inputs: [
      {
        internalType: "contract ERC20",
        name: "collateral_",
        type: "address",
      },
      {
        internalType: "contract ERC20",
        name: "debt_",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "generateCooler",
    outputs: [
      {
        internalType: "address",
        name: "cooler",
        type: "address",
      },
    ],
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
    name: "created",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
  },
] as const;
