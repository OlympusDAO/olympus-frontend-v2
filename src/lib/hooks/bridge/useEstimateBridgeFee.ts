import { useReadContract } from "wagmi";
import type { Address } from "viem";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { useMockData } from "@/lib/mock/provider";
import { CCIP_CHAIN_SELECTORS } from "@/modules/ohm/utils/constants";

/** Quotes the native fee for display. `getFeeEVM` reverts until the route has a trusted remote. */
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
  const bridgeAddress = getContractAddress(ContractName.CCIP_BRIDGE, sourceChainId);
  const selector = CCIP_CHAIN_SELECTORS[destinationChainId];

  const { data, isLoading, error } = useReadContract({
    address: bridgeAddress,
    abi: CCIPCrossChainBridgeAbi,
    functionName: "getFeeEVM",
    args: [selector, recipientAddress!, amount],
    chainId: sourceChainId,
    query: {
      enabled:
        !mock && !!bridgeAddress && selector !== undefined && !!recipientAddress && amount > 0n,
      refetchInterval: 30_000,
      retry: false,
    },
  });

  if (mock?.scenario.bridge) {
    return {
      nativeFee: amount > 0n ? BigInt(mock.scenario.bridge.nativeFeeWei) : undefined,
      isLoading: false,
      error: null,
    };
  }

  return { nativeFee: data, isLoading, error };
}
