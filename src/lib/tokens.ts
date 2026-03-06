import type { Address } from "viem";
import type { IconName } from "@/components/icon.tsx";
import type { ChainId } from "./contracts";
import { mainnet, sepolia } from "viem/chains";

export type TokenInfo = {
  addresses: Partial<Record<ChainId, Address>>;
  symbol: string;
  decimals: number;
  icon: IconName;
};

export enum TokenName {
  USDS = "USDS",
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
