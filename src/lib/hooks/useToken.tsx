import { useTokenBalance } from "./useTokenBalance";
import { formatUnits, type Address } from "viem";
import { useChainId } from "wagmi";
import { TOKENS, type TokenInfo, getTokenAddress } from "@/lib/tokens.ts";

export type TokenWithBalance = TokenInfo & {
  balance: bigint | undefined;
  formattedBalance: string;
  address?: Address;
  price: number;
};

export function useToken(symbol: keyof typeof TOKENS, account?: Address): TokenWithBalance {
  const chainId = useChainId();
  const info = TOKENS[symbol];
  const tokenAddress = getTokenAddress(symbol, chainId);

  const { balance } = useTokenBalance(tokenAddress, account);

  return {
    ...info,
    address: tokenAddress,
    price: 0,
    balance,
    formattedBalance: balance !== undefined ? formatUnits(balance, info.decimals) : "0",
  };
}
