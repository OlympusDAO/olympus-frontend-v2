export default [
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "factory",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "INTEREST_RATE",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "DURATION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "LOAN_TO_COLLATERAL",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "gohm",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "active",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "dai",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "sdai",
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
        name: "cooler_",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "loanID_",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "times_",
        type: "uint8",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "extendLoan",
  },
] as const;
