import type { Address } from "viem";
import type { IconName } from "@/components/icon.tsx";
import type { ChainId } from "./contracts";
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

export type TokenInfo = {
  addresses: Partial<Record<ChainId, Address>>;
  symbol: string;
  decimals: number;
  icon: IconName;
};

export enum TokenName {
  USDS = "USDS",
  OHM = "OHM",
  SOHM = "SOHM",
  GOHM = "GOHM",
  WSOHM = "WSOHM",
  V1_OHM = "V1_OHM",
  V1_SOHM = "V1_SOHM",
}

export const TOKENS: Record<TokenName, TokenInfo> = {
  USDS: {
    addresses: {
      [mainnet.id]: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
      [sepolia.id]: "0xDd668BdDb4241F4fAFBB0BC0d75b49EbEE88B4FC",
    },
    symbol: "USDS",
    decimals: 18,
    icon: "USDSColorTokenIcon",
  },
  OHM: {
    addresses: {
      [mainnet.id]: "0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D5",
      [arbitrum.id]: "0xf0cb2dc0db5e6c66B9a70Ac27B06b878da017028",
      [base.id]: "0x060cb087a9730E13aa191f31A6d86bFF8DfcdCC0",
      [berachain.id]: "0x18878df23e2a36f81e820e4b47b4a40576d3159c",
      [sepolia.id]: "0x784cA0C006b8651BAB183829A99fA46BeCe50dBc",
    },
    symbol: "OHM",
    decimals: 9,
    icon: "OHMColorTokenIcon",
  },
  SOHM: {
    addresses: {
      [mainnet.id]: "0x04906695D6D12CF5459975d7C3C03356E4Ccd460",
      [sepolia.id]: "0x7aEe38DbB5465a05EE809d00d1C34dB76F8c5B72",
    },
    symbol: "sOHM",
    decimals: 9,
    icon: "OHMColorTokenIcon",
  },
  GOHM: {
    addresses: {
      [mainnet.id]: "0x0ab87046fBb341D058F17CBC4c1133F25a20a52f",
      [arbitrum.id]: "0x8D9bA570D6cb60C7e3e0F31343Efe75AB8E65FB1",
      [avalanche.id]: "0x321e7092a180bb43555132ec53aaa65a5bf84251",
      [polygon.id]: "0xd8cA34fd379d9ca3C6Ee3b3905678320F5b45195",
      [fantom.id]: "0x91fa20244fb509e8289ca630e5db3e9166233fdc",
      [optimism.id]: "0x0b5740c6b4a97f90eF2F0220651Cca420B868FfB",
      [boba.id]: "0xd22C0a4Af486C7FA08e282E9eB5f30F9AaA62C95",
      [sepolia.id]: "0x0f7F33f915B29476ca2b2606C8A3e06A5FC7e896",
    },
    symbol: "gOHM",
    decimals: 18,
    icon: "GOHMColorTokenIcon",
  },
  WSOHM: {
    addresses: {
      [mainnet.id]: "0xCa76543Cf381ebBB277bE79574059e32108e3E65",
      [arbitrum.id]: "0x739CA6D71365A08f584c8fC4e1029021fCEfbD18",
      [avalanche.id]: "0x8CD309e14575203535EF120b5b0Ab4DDeD0C2073",
    },
    symbol: "wsOHM",
    decimals: 18,
    icon: "GOHMColorTokenIcon",
  },
  V1_OHM: {
    addresses: {
      [mainnet.id]: "0x383518188c0c6d7730d91b2c03a03c837814a899",
    },
    symbol: "OHM v1",
    decimals: 9,
    icon: "OHMColorTokenIcon",
  },
  V1_SOHM: {
    addresses: {
      [mainnet.id]: "0x04F2694C8fcee23e8Fd0dfEA1d4f5Bb8c352111F",
    },
    symbol: "sOHM v1",
    decimals: 9,
    icon: "OHMColorTokenIcon",
  },
};

export function getTokenAddress(token: TokenName, chainId: ChainId): Address | undefined {
  return TOKENS[token].addresses[chainId];
}

export function requireTokenAddress(token: TokenName, chainId: ChainId): Address {
  const address = getTokenAddress(token, chainId);
  if (!address) {
    throw new Error(`Token ${token} not found on chain ${chainId}`);
  }
  return address;
}
