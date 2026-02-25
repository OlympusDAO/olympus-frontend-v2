import type { Address } from "viem";
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

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  addresses: Partial<Record<number, Address>>;
}

export const OHM: TokenInfo = {
  symbol: "OHM",
  name: "Olympus",
  decimals: 9,
  addresses: {
    [mainnet.id]: "0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5",
    [arbitrum.id]: "0xf0cb2dc0db5e6c66B9a70Ac27B06b878da017028",
    [base.id]: "0x060cb087a9730E13aa191f31A6d86bFF8DfcdCC0",
    [berachain.id]: "0x18878df23e2a36f81e820e4b47b4a40576d3159c",
  },
};

export const SOHM: TokenInfo = {
  symbol: "sOHM",
  name: "Staked OHM",
  decimals: 9,
  addresses: {
    [mainnet.id]: "0x04906695D6D12CF5459975d7C3C03356E4Ccd460",
  },
};

export const GOHM: TokenInfo = {
  symbol: "gOHM",
  name: "Governance OHM",
  decimals: 18,
  addresses: {
    [mainnet.id]: "0x0ab87046fBb341D058F17CBC4c1133F25a20a52f",
    [arbitrum.id]: "0x8D9bA570D6cb60C7e3e0F31343Efe75AB8E65FB1",
    [avalanche.id]: "0x321e7092a180bb43555132ec53aaa65a5bf84251",
    [polygon.id]: "0xd8cA34fd379d9ca3C6Ee3b3905678320F5b45195",
    [fantom.id]: "0x91fa20244fb509e8289ca630e5db3e9166233fdc",
    [optimism.id]: "0x0b5740c6b4a97f90eF2F0220651Cca420B868FfB",
    [boba.id]: "0xd22C0a4Af486C7FA08e282E9eB5f30F9AaA62C95",
    [sepolia.id]: "0xBA05d48Fb94dC76820EB7ea1B360fd6DfDEabdc5",
  },
};

export const DAI: TokenInfo = {
  symbol: "DAI",
  name: "Dai Stablecoin",
  decimals: 18,
  addresses: {
    [mainnet.id]: "0x6b175474e89094c44da98b954eedeac495271d0f",
  },
};

export const USDS: TokenInfo = {
  symbol: "USDS",
  name: "USDS",
  decimals: 18,
  addresses: {
    [mainnet.id]: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
    [sepolia.id]: "0xDd668BdDb4241F4fAFBB0BC0d75b49EbEE88B4FC",
  },
};

/**
 * All known tokens.
 */
export const TOKENS = { OHM, SOHM, GOHM, DAI, USDS } as const;

/**
 * Look up a token address on a specific chain.
 */
export function getTokenAddress(
  token: TokenInfo,
  chainId: number,
): Address | undefined {
  return token.addresses[chainId];
}

/**
 * Look up a token address, throwing if not found.
 */
export function requireTokenAddress(
  token: TokenInfo,
  chainId: number,
): Address {
  const address = getTokenAddress(token, chainId);
  if (!address) {
    throw new Error(`Token ${token.symbol} not available on chain ${chainId}`);
  }
  return address;
}
