import { useReadContract, useChainId } from "wagmi";
import { ContractName, requireContractAddress } from "@/lib/contracts";
import ConvertibleDepositAuctioneerAbi from "@/abis/ConvertibleDepositAuctioneer";
import { parseEther } from "viem";

interface UsePreviewBidParams {
  depositPeriod: number;
  bidAmount: string; // Amount in string format (e.g., "100")
  enabled?: boolean;
}

export function usePreviewBid({ depositPeriod, bidAmount, enabled = true }: UsePreviewBidParams) {
  const chainId = useChainId();

  const contractAddress = chainId
    ? requireContractAddress(ContractName.CONVERTIBLE_DEPOSIT_AUCTIONEER, chainId)
    : undefined;

  // Convert bidAmount to wei (18 decimals for USDS)
  const bidAmountWei =
    bidAmount && bidAmount !== "0" && bidAmount !== "" ? parseEther(bidAmount) : 0n;

  const {
    data: ohmOut,
    isLoading,
    isError,
    error,
  } = useReadContract({
    address: contractAddress,
    abi: ConvertibleDepositAuctioneerAbi,
    functionName: "previewBid",
    args: [depositPeriod, bidAmountWei],
    query: {
      enabled: !!(contractAddress && depositPeriod && bidAmountWei > 0n && enabled),
    },
  });

  return {
    ohmOut: ohmOut,
    isLoading,
    isError,
    error,
  };
}

// Helper function to format OHM output (9 decimals)
export function formatOhmOutput(ohmOut: bigint): string {
  return (Number(ohmOut) / 1e9).toFixed(4);
}

// Helper function to format receipt token amount (18 decimals)
export function formatReceiptTokenAmount(amount: string): string {
  return parseFloat(amount || "0").toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
