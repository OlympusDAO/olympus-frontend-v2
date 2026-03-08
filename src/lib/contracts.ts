import type { Address } from "viem";

export type ChainId = number;

import {
  mainnet,
  arbitrum,
  polygon,
  optimism,
  avalanche,
  boba,
  fantom,
  base,
  berachain,
  sepolia,
} from "@/lib/chains";

/**
 * Registry of all known contract names.
 * Add new contracts here as the app grows.
 */
export enum ContractName {
  // Core
  OHM = "OHM",
  SOHM = "SOHM",
  GOHM = "GOHM",
  STAKING = "STAKING",
  WSOHM = "WSOHM",
  V1_OHM = "V1_OHM",
  V1_SOHM = "V1_SOHM",

  // Cooler
  COOLER_CLEARING_HOUSE_V3 = "COOLER_CLEARING_HOUSE_V3",
  COOLER_V2_MONOCOOLER = "COOLER_V2_MONOCOOLER",
  COOLER_V2_COMPOSITES = "COOLER_V2_COMPOSITES",
  COOLER_V2_MIGRATOR = "COOLER_V2_MIGRATOR",

  // Convertible Deposits
  CONVERTIBLE_DEPOSIT_FACILITY = "CONVERTIBLE_DEPOSIT_FACILITY",
  CONVERTIBLE_DEPOSIT_AUCTIONEER = "CONVERTIBLE_DEPOSIT_AUCTIONEER",
  CONVERTIBLE_DEPOSIT_POSITION_MANAGER = "CONVERTIBLE_DEPOSIT_POSITION_MANAGER",
  RECEIPT_TOKEN_MANAGER = "RECEIPT_TOKEN_MANAGER",
  DEPOSIT_REDEMPTION_VAULT = "DEPOSIT_REDEMPTION_VAULT",
  LIMIT_ORDERS = "LIMIT_ORDERS",
  PRICE = "PRICE",
}

type ContractAddresses = {
  [K in ContractName]: Partial<Record<number, Address>>;
};

/**
 * Contract addresses by chain.
 * When adding a new contract, add it to the ContractName enum and this map.
 */
export const CONTRACTS: ContractAddresses = {
  // ── Core ──────────────────────────────────────────────
  [ContractName.OHM]: {
    [mainnet.id]: "0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5",
    [arbitrum.id]: "0xf0cb2dc0db5e6c66B9a70Ac27B06b878da017028",
    [base.id]: "0x060cb087a9730E13aa191f31A6d86bFF8DfcdCC0",
    [berachain.id]: "0x18878df23e2a36f81e820e4b47b4a40576d3159c",
    [sepolia.id]: "0x784cA0C006b8651BAB183829A99fA46BeCe50dBc",
  },
  [ContractName.SOHM]: {
    [mainnet.id]: "0x04906695D6D12CF5459975d7C3C03356E4Ccd460",
    [sepolia.id]: "0x7aEe38DbB5465a05EE809d00d1C34dB76F8c5B72",
  },
  [ContractName.GOHM]: {
    [mainnet.id]: "0x0ab87046fBb341D058F17CBC4c1133F25a20a52f",
    [arbitrum.id]: "0x8D9bA570D6cb60C7e3e0F31343Efe75AB8E65FB1",
    [avalanche.id]: "0x321e7092a180bb43555132ec53aaa65a5bf84251",
    [polygon.id]: "0xd8cA34fd379d9ca3C6Ee3b3905678320F5b45195",
    [fantom.id]: "0x91fa20244fb509e8289ca630e5db3e9166233fdc",
    [optimism.id]: "0x0b5740c6b4a97f90eF2F0220651Cca420B868FfB",
    [boba.id]: "0xd22C0a4Af486C7FA08e282E9eB5f30F9AaA62C95",
    [sepolia.id]: "0x0f7F33f915B29476ca2b2606C8A3e06A5FC7e896",
  },
  [ContractName.STAKING]: {
    [mainnet.id]: "0xB63cac384247597756545b500253ff8E607a8020",
    [sepolia.id]: "0xbC2778f2F24864D35D806AA968A1DB445988A5E9",
  },
  [ContractName.WSOHM]: {
    [mainnet.id]: "0xCa76543Cf381ebBB277bE79574059e32108e3E65",
    [arbitrum.id]: "0x739ca6D71365a08f584c8FC4e1029021FcefBD18",
    [avalanche.id]: "0x8CD309e14575203535EF120b5b0Ab4DDeD0C2073",
  },
  [ContractName.V1_OHM]: {
    [mainnet.id]: "0x383518188c0c6d7730D91b2c03a03C36BCD12f65",
  },
  [ContractName.V1_SOHM]: {
    [mainnet.id]: "0x04F2694C8fcee23e8Fd0dfEA1d4f5Bb8c352111F",
  },

  // ── Cooler ────────────────────────────────────────────
  [ContractName.COOLER_CLEARING_HOUSE_V3]: {
    [mainnet.id]: "0x1e094fE00E13Fd06D64EeA4FB3cD912893606fE0",
  },
  [ContractName.COOLER_V2_MONOCOOLER]: {
    [mainnet.id]: "0xdb591Ea2e5Db886dA872654D58f6cc584b68e7cC",
    [sepolia.id]: "0x8bEB701EBaf8CD68B7E8f04BFA4fC7387cF711E0",
  },
  [ContractName.COOLER_V2_COMPOSITES]: {
    [mainnet.id]: "0x6593768feBF9C95aC857Fb7Ef244D5738D1C57Fd",
    [sepolia.id]: "0x992ea219636777de4b99b63bbb0b08b90a3d57da",
  },
  [ContractName.COOLER_V2_MIGRATOR]: {
    [mainnet.id]: "0xE045BD0A0d85E980AA152064C06EAe6B6aE358D2",
    [sepolia.id]: "0x70233D8F47042d3A5813026e2157B5181C608cD0",
  },

  // ── Convertible Deposits ──────────────────────────────
  [ContractName.CONVERTIBLE_DEPOSIT_FACILITY]: {
    [mainnet.id]: "0xEBDe552D851DD6Dfd3D360C596D3F4aF6e5F9678",
    [sepolia.id]: "0x0bE69702E83f06A027E6841B614f6946d1265441",
  },
  [ContractName.CONVERTIBLE_DEPOSIT_AUCTIONEER]: {
    [mainnet.id]: "0xF35193DA8C10e44aF10853Ba5a3a1a6F7529E39a",
    [sepolia.id]: "0x247f1989aDc0F63D07b91Bf645De879b9de06fbB",
  },
  [ContractName.CONVERTIBLE_DEPOSIT_POSITION_MANAGER]: {
    [mainnet.id]: "0x02331A4c97a4841084dF54d7c0eC04DD3f1A9F1c",
    [sepolia.id]: "0xEF928e9ed1083636e34230543D4ad3B6270Fa986",
  },
  [ContractName.RECEIPT_TOKEN_MANAGER]: {
    [mainnet.id]: "0xD98B5b2E4D5d6Cd554115DE19EfB7A9084BEddd1",
    [sepolia.id]: "0x95F6CfFFCbdaecB76f1cA335Ceda4247c45B45E4",
  },
  [ContractName.DEPOSIT_REDEMPTION_VAULT]: {
    [mainnet.id]: "0x20a3d8510f2e1176E8Db4CeA9883a8287a9029Db",
    [sepolia.id]: "0x93AcaDa86ad23C85e96869D46945fA6FFb7a4036",
  },
  [ContractName.LIMIT_ORDERS]: {
    [mainnet.id]: "0x7d8f82A0D5B67d5FDd1B77A899FF517818FaFc2e",
    [sepolia.id]: "0xeF64baB08c3431BbC527B063354b95D1C5b549B0",
  },
  [ContractName.PRICE]: {
    [mainnet.id]: "0xd6C4D723fdadCf0D171eF9A2a3Bfa870675b282f",
    [sepolia.id]: "0x3bD25E292dC36b674BBF1EEecaAB4565bf2eF241",
  },
};

/**
 * Look up a contract address on a specific chain.
 */
export function getContractAddress(
  contractName: ContractName,
  chainId: number,
): Address | undefined {
  return CONTRACTS[contractName][chainId];
}

/**
 * Look up a contract address, throwing if not found.
 */
export function requireContractAddress(contractName: ContractName, chainId: number): Address {
  const address = getContractAddress(contractName, chainId);
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on chain ${chainId}`);
  }
  return address;
}
