import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import LZCrossChainBridgeAbi from "@/abis/LZCrossChainBridge";
import { chainIdToEid } from "@/modules/ohm/utils/constants";
import { useMockData } from "@/lib/mock/provider";

/**
 * Buffer applied on top of the estimated native fee when sending the transaction.
 * LayerZero refunds any overpayment to the sender, so a small buffer absorbs fee
 * drift between estimate and execution without costing the user anything.
 */
const FEE_BUFFER_BPS = 1000n; // +10%

export function applyFeeBuffer(nativeFee: bigint): bigint {
  return (nativeFee * (10_000n + FEE_BUFFER_BPS)) / 10_000n;
}

export function useEstimateBridgeFee({
  sourceChainId,
  destinationChainId,
  recipientAddress,
  amount,
}: {
  sourceChainId: number;
  destinationChainId: number;
  recipientAddress?: Address;
  amount: bigint;
}) {
  const mock = useMockData();
  const bridgeAddress = getContractAddress(ContractName.LZ_CROSS_CHAIN_BRIDGE, sourceChainId);
  const dstEid = chainIdToEid(destinationChainId);

  const { data, isLoading, error } = useReadContract({
    address: bridgeAddress,
    abi: LZCrossChainBridgeAbi,
    functionName: "estimateSendFee",
    args: [dstEid!, recipientAddress!, amount],
    chainId: sourceChainId,
    query: {
      enabled: !mock && !!bridgeAddress && !!dstEid && !!recipientAddress && amount > 0n,
      refetchInterval: 30_000,
    },
  });

  if (mock?.scenario.bridge) {
    const fee = BigInt(mock.scenario.bridge.nativeFeeWei);
    return {
      nativeFee: amount > 0n ? fee : undefined,
      bufferedFee: amount > 0n ? applyFeeBuffer(fee) : undefined,
      isLoading: false,
      error: null,
    };
  }

  // estimateSendFee returns a MessagingFee { nativeFee, lzTokenFee }; lzTokenFee is unused.
  const nativeFee = data?.nativeFee;

  return {
    nativeFee,
    bufferedFee: nativeFee != null ? applyFeeBuffer(nativeFee) : undefined,
    isLoading,
    error,
  };
}
