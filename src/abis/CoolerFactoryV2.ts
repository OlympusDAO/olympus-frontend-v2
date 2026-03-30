export default [
  {
    inputs: [
      {
        internalType: "address",
        name: "user_",
        type: "address",
      },
      {
        internalType: "address",
        name: "collateral_",
        type: "address",
      },
      {
        internalType: "address",
        name: "debt_",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
    name: "getCoolerFor",
    outputs: [
      {
        internalType: "address",
        name: "",
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
