import { useChainId, useReadContract } from "wagmi";
import type { Address } from "viem";
import { useReceiptTokenManager } from "./useReceiptTokenManager";
import ReceiptTokenManagerABI from "@/abis/ReceiptTokenManager";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { useDepositManager } from "./useDepositManager";

export function useReceiptTokenId(
  asset: Address | undefined,
  periodMonths: number | undefined
) {
  const chainId = useChainId();
  const facilityAddress = getContractAddress(
    ContractName.CONVERTIBLE_DEPOSIT_FACILITY,
    chainId
  );

  const { receiptTokenManagerAddress } = useReceiptTokenManager();
  const { depositManagerAddress } = useDepositManager(facilityAddress);

  const { data: tokenId } = useReadContract({
    address: receiptTokenManagerAddress,
    abi: ReceiptTokenManagerABI,
    functionName: "getReceiptTokenId",
    args:
      depositManagerAddress &&
      asset &&
      periodMonths !== undefined &&
      facilityAddress
        ? [depositManagerAddress, asset, periodMonths, facilityAddress]
        : undefined,
    query: {
      enabled: !!(
        receiptTokenManagerAddress &&
        facilityAddress &&
        asset &&
        periodMonths !== undefined
      ),
    },
  });

  return { tokenId: tokenId as bigint | undefined };
}

export function useReceiptTokenAddress(
  asset: Address | undefined,
  periodMonths: number | undefined
) {
  const { receiptTokenManagerAddress } = useReceiptTokenManager();

  const { tokenId } = useReceiptTokenId(asset, periodMonths);

  const {
    data: wrappedTokenAddress,
    isLoading,
    error,
  } = useReadContract({
    address: receiptTokenManagerAddress,
    abi: ReceiptTokenManagerABI,
    functionName: "getWrappedToken",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: !!(receiptTokenManagerAddress && tokenId !== undefined),
    },
  });

  return {
    receiptTokenAddress: wrappedTokenAddress as Address | undefined,
    tokenId,
    receiptTokenManagerAddress,
    isLoading,
    error,
  };
}

export function useReceiptTokenBalance(
  asset: Address | undefined,
  periodMonths: number | undefined,
  userAddress: Address | undefined
) {
  const { receiptTokenManagerAddress } = useReceiptTokenManager();
  const { receiptTokenAddress, tokenId } = useReceiptTokenAddress(
    asset,
    periodMonths
  );

  // Use ReceiptTokenManager's balanceOf for ERC6909 tokens
  const {
    data: balance,
    isLoading,
    error,
  } = useReadContract({
    address: receiptTokenManagerAddress,
    abi: ReceiptTokenManagerABI,
    functionName: "balanceOf",
    args:
      userAddress && tokenId !== undefined ? [userAddress, tokenId] : undefined,
    query: {
      enabled: !!(
        receiptTokenManagerAddress &&
        userAddress &&
        tokenId !== undefined
      ),
    },
  });

  return {
    balance: balance as bigint | undefined,
    receiptTokenAddress,
    tokenId,
    isLoading,
    error,
  };
}

export function useReceiptTokenName(tokenId: bigint | undefined) {
  const { receiptTokenManagerAddress } = useReceiptTokenManager();

  const {
    data: tokenName,
    isLoading,
    error,
  } = useReadContract({
    address: receiptTokenManagerAddress,
    abi: ReceiptTokenManagerABI,
    functionName: "getTokenSymbol",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: !!(receiptTokenManagerAddress && tokenId !== undefined),
    },
  });

  return {
    tokenName: tokenName
      ? (tokenName as string).replace(/\0/g, "").trim()
      : undefined,
    isLoading,
    error,
  };
}
