import { useTokenBalance } from "./useTokenBalance"
import { formatUnits, Address } from "viem"
import { useChainId } from "wagmi"
import { TOKENS, TokenInfo, getTokenAddress } from '@/lib/tokens.ts';

export type TokenWithBalance = TokenInfo & {
  balance: bigint | undefined
  formattedBalance: string
  address: Address
}

export function useToken(symbol: keyof typeof TOKENS, account?: Address): TokenWithBalance | null {
  const chainId = useChainId()
  const info = TOKENS[symbol]
  const tokenAddress = getTokenAddress(symbol, chainId)
  
  const { balance } = useTokenBalance(tokenAddress, account)

  if (!tokenAddress) {
    return null
  }

  return {
    ...info,
    address: tokenAddress,
    balance,
    formattedBalance: balance !== undefined
      ? formatUnits(balance, info.decimals)
      : '0'
  }
}
