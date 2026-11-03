import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { erc20Abi } from "viem";

export function useTokenBalance(tokenAddress?: Address, account?: Address, chainId?: number) {
  const {
    data: result,
    isLoading,
    error,
  } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account!],
    chainId,
    query: {
      enabled: !!account && !!tokenAddress,
    },
  });

  return {
    balance: result as bigint | undefined,
    isLoading,
    error,
  };
}
