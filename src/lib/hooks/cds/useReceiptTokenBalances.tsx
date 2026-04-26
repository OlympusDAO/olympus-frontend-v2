import { useReadContract, useReadContracts } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { useChainId } from "wagmi";
import ReceiptTokenManagerABI from "@/abis/ReceiptTokenManager";
import { formatEther, erc20Abi } from "viem";

interface TokenBalance {
  asset: string;
  periodMonths: number;
  totalBalance: bigint;
  wrappedBalance?: bigint;
  displayName: string;
  tokenId: bigint;
  wrappedTokenAddress: string;
  isWrapped: boolean;
}

interface ReceiptTokenBalance {
  tokenId: bigint;
  balance: bigint;
  wrappedToken: string;
  name: string;
  symbol: string;
  decimals: number;
  displayName: string;
  asset: string;
  periodMonths: number;
}

export function useReceiptTokenBalances(userAddress?: string) {
  const chainId = useChainId();
  const receiptTokenManagerAddress = getContractAddress(
    ContractName.RECEIPT_TOKEN_MANAGER,
    chainId,
  );

  // Get all wrappable tokens from ReceiptTokenManager
  const {
    data: wrappableTokensData,
    isLoading: isLoadingTokens,
    error: tokensError,
  } = useReadContract({
    address: receiptTokenManagerAddress,
    abi: ReceiptTokenManagerABI,
    functionName: "getWrappableTokens",
    query: {
      enabled: !!receiptTokenManagerAddress,
    },
  });

  const tokenIds = wrappableTokensData?.[0] || [];
  const wrappedTokens = wrappableTokensData?.[1] || [];

  // Get balance for each token ID for the user
  const {
    data: balanceResults,
    isLoading: isLoadingBalances,
    error: balancesError,
  } = useReadContracts({
    contracts: tokenIds.map((tokenId: bigint) => ({
      address: receiptTokenManagerAddress,
      abi: ReceiptTokenManagerABI,
      functionName: "balanceOf",
      args: [userAddress, tokenId],
    })),
    query: {
      enabled: !!receiptTokenManagerAddress && !!userAddress && tokenIds.length > 0,
    },
  });

  // Get token metadata for each token ID
  const {
    data: metadataResults,
    isLoading: isLoadingMetadata,
    error: metadataError,
  } = useReadContracts({
    contracts: tokenIds.flatMap((tokenId: bigint) => [
      {
        address: receiptTokenManagerAddress,
        abi: ReceiptTokenManagerABI,
        functionName: "getTokenName",
        args: [tokenId],
      },
      {
        address: receiptTokenManagerAddress,
        abi: ReceiptTokenManagerABI,
        functionName: "getTokenSymbol",
        args: [tokenId],
      },
      {
        address: receiptTokenManagerAddress,
        abi: ReceiptTokenManagerABI,
        functionName: "getTokenDecimals",
        args: [tokenId],
      },
      {
        address: receiptTokenManagerAddress,
        abi: ReceiptTokenManagerABI,
        functionName: "getTokenAsset",
        args: [tokenId],
      },
      {
        address: receiptTokenManagerAddress,
        abi: ReceiptTokenManagerABI,
        functionName: "getTokenDepositPeriod",
        args: [tokenId],
      },
    ]),
    query: {
      enabled: !!receiptTokenManagerAddress && tokenIds.length > 0,
    },
  });

  // Get wrapped ERC-20 balances for each wrapped token
  const {
    data: wrappedBalanceResults,
    isLoading: isLoadingWrappedBalances,
    error: wrappedBalancesError,
  } = useReadContracts({
    contracts: wrappedTokens.map((wrappedToken: string) => ({
      address: wrappedToken as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`],
    })),
    query: {
      enabled: !!userAddress && wrappedTokens.length > 0,
    },
  });

  const isLoading =
    isLoadingTokens || isLoadingBalances || isLoadingMetadata || isLoadingWrappedBalances;
  const error = tokensError || balancesError || metadataError || wrappedBalancesError;

  // Process the data
  const receiptTokenBalances: ReceiptTokenBalance[] = [];
  const tokenBalances: TokenBalance[] = [];
  const unwrappedBalances: TokenBalance[] = [];
  const wrappedBalances: TokenBalance[] = [];
  let totalPositionCount = 0;

  if (tokenIds && balanceResults && metadataResults) {
    tokenIds.forEach((tokenId: bigint, index: number) => {
      const balance = balanceResults[index]?.result as bigint;
      const wrappedToken = wrappedTokens[index] as string;
      const wrappedBalance = wrappedBalanceResults?.[index]?.result as bigint | undefined;

      const metadataIndex = index * 5;
      const rawName = (metadataResults[metadataIndex]?.result as string) || "";
      const rawSymbol = (metadataResults[metadataIndex + 1]?.result as string) || "";
      const name = rawName.replace(/\0/g, "").trim();
      const symbol = rawSymbol.replace(/\0/g, "").trim();
      const decimals = (metadataResults[metadataIndex + 2]?.result as number) || 18;
      const asset = (metadataResults[metadataIndex + 3]?.result as string) || "";
      const periodMonths = (metadataResults[metadataIndex + 4]?.result as number) || 0;

      // Include in receiptTokenBalances if user has unwrapped balance
      if (balance && balance > 0n) {
        receiptTokenBalances.push({
          tokenId,
          balance,
          wrappedToken,
          name,
          symbol,
          decimals,
          displayName: symbol, // Use symbol as display name
          asset,
          periodMonths,
        });

        // Each tokenId is unique, so create a TokenBalance for each one
        tokenBalances.push({
          asset,
          periodMonths,
          totalBalance: balance,
          displayName: symbol,
          tokenId,
          wrappedTokenAddress: wrappedToken,
          isWrapped: false,
        });

        // Add to unwrappedBalances array
        unwrappedBalances.push({
          asset,
          periodMonths,
          totalBalance: balance,
          displayName: symbol,
          tokenId,
          wrappedTokenAddress: wrappedToken,
          isWrapped: false,
        });

        totalPositionCount += 1;
      }

      // Include in wrappedBalances if user has wrapped balance
      if (wrappedBalance && wrappedBalance > 0n) {
        wrappedBalances.push({
          asset,
          periodMonths,
          totalBalance: 0n,
          wrappedBalance,
          displayName: symbol,
          tokenId,
          wrappedTokenAddress: wrappedToken,
          isWrapped: true,
        });

        totalPositionCount += 1;
      }
    });
  }

  return {
    tokenBalances,
    unwrappedBalances,
    wrappedBalances,
    receiptTokenBalances,
    totalPositionCount,
    isLoading,
    error,
  };
}

export function formatTokenBalance(balance: bigint): string {
  return parseFloat(formatEther(balance)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
