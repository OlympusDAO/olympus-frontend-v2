export default [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "loanID_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "repayment_",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "repayLoan",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
    name: "loans",
    outputs: [
      {
        internalType: "struct Cooler.Request",
        name: "request",
        type: "tuple",
        components: [
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "interest",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "loanToCollateral",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "duration",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "active",
            type: "bool",
          },
          {
            internalType: "address",
            name: "requester",
            type: "address",
          },
        ],
      },
      {
        internalType: "uint256",
        name: "principal",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "interestDue",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "collateral",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "expiry",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "lender",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "bool",
        name: "callback",
        type: "bool",
      },
    ],
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "loanID_",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
    name: "getLoan",
    outputs: [
      {
        internalType: "struct Cooler.Loan",
        name: "",
        type: "tuple",
        components: [
          {
            internalType: "struct Cooler.Request",
            name: "request",
            type: "tuple",
            components: [
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "interest",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "loanToCollateral",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "duration",
                type: "uint256",
              },
              {
                internalType: "bool",
                name: "active",
                type: "bool",
              },
              {
                internalType: "address",
                name: "requester",
                type: "address",
              },
            ],
          },
          {
            internalType: "uint256",
            name: "principal",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "interestDue",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "collateral",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "expiry",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "lender",
            type: "address",
          },
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
          {
            internalType: "bool",
            name: "callback",
            type: "bool",
          },
        ],
      },
    ],
  },
  {
    inputs: [],
    stateMutability: "pure",
    type: "function",
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
    ],
  },
] as const;
