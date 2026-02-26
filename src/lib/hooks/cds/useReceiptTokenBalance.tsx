import { useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import { erc20Abi } from "viem";

interface ReceiptTokenBalanceParams {
  receiptTokenAddress?: `0x${string}`;
  enabled?: boolean;
}

export const useReceiptTokenBalance = ({ 
  receiptTokenAddress, 
  enabled = true 
}: ReceiptTokenBalanceParams) => {
  const { address } = useAccount();

  const shouldExecute = enabled && 
    !!address && 
    !!receiptTokenAddress;

  const { data: balance, isLoading, error, refetch } = useReadContract({
    address: receiptTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    query: {
      enabled: shouldExecute,
    },
  });

  return {
    balance: balance || 0n,
    isLoading,
    error,
    refetch,
  };
};

// Note: We need to determine how to get the receipt token address for a given asset/period
// This might require calling the DepositManager to get the receipt token address