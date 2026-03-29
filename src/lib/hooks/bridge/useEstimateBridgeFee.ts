import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import CrossChainBridgeAbi from "@/abis/CrossChainBridge";
import { LAYER_ZERO_CHAIN_IDS } from "@/modules/bridge/constants";
import { useMockData } from "@/lib/mock/provider";

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
  const bridgeAddress = getContractAddress(ContractName.CROSS_CHAIN_BRIDGE, sourceChainId);
  const layerZeroChainId = LAYER_ZERO_CHAIN_IDS[destinationChainId];

  const { data, isLoading, error } = useReadContract({
    address: bridgeAddress,
    abi: CrossChainBridgeAbi,
    functionName: "estimateSendFee",
    args: [layerZeroChainId, recipientAddress!, amount, "0x"],
    chainId: sourceChainId,
    query: {
      enabled: !mock && !!bridgeAddress && !!layerZeroChainId && !!recipientAddress && amount > 0n,
      refetchInterval: 30_000,
    },
  });

  if (mock?.scenario.bridge) {
    const fee = BigInt(mock.scenario.bridge.nativeFeeWei);
    return {
      nativeFee: amount > 0n ? fee : undefined,
      zroFee: 0n,
      isLoading: false,
      error: null,
    };
  }

  return {
    nativeFee: data?.[0] as bigint | undefined,
    zroFee: data?.[1] as bigint | undefined,
    isLoading,
    error,
  };
}
