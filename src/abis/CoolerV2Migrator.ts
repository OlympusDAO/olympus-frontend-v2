export default [
  {
    inputs: [
      {
        internalType: "address[]",
        name: "coolers_",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "newOwner_",
        type: "address",
      },
      {
        internalType: "struct IMonoCooler.Authorization",
        name: "authorization_",
        type: "tuple",
        components: [
          {
            internalType: "address",
            name: "account",
            type: "address",
          },
          {
            internalType: "address",
            name: "authorized",
            type: "address",
          },
          {
            internalType: "uint96",
            name: "authorizationDeadline",
            type: "uint96",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "signatureDeadline",
            type: "uint256",
          },
        ],
      },
      {
        internalType: "struct IMonoCooler.Signature",
        name: "signature_",
        type: "tuple",
        components: [
          {
            internalType: "uint8",
            name: "v",
            type: "uint8",
          },
          {
            internalType: "bytes32",
            name: "r",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "s",
            type: "bytes32",
          },
        ],
      },
      {
        internalType: "struct IDLGTEv1.DelegationRequest[]",
        name: "delegationRequests_",
        type: "tuple[]",
        components: [
          {
            internalType: "address",
            name: "delegate",
            type: "address",
          },
          {
            internalType: "int256",
            name: "amount",
            type: "int256",
          },
        ],
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "consolidate",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "coolers_",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
    name: "previewConsolidate",
    outputs: [
      {
        internalType: "uint256",
        name: "collateralAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "borrowAmount",
        type: "uint256",
      },
    ],
  },
] as const;
