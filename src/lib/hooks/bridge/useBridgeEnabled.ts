import { useReadContract } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import LZCrossChainBridgeAbi from "@/abis/LZCrossChainBridge";
import LZBridgeGatewayAbi from "@/abis/LZBridgeGateway";
import { useMockData } from "@/lib/mock/provider";

/**
 * Pre-flight enablement checks for a bridge route.
 *
 * A route is sendable only when, on the SOURCE chain, both the facilitator and the
 * gateway are enabled (so OHM can be burned and sent), and on the DESTINATION chain
 * the gateway can receive (mint). The destination read is cross-chain.
 *
 * If `isReceiveEnabled` is false on the destination, the message would burn on the
 * source and then get stuck pending recovery — so it is treated as a blocking reason.
 */
export function useBridgeEnabled(sourceChainId: number, destinationChainId?: number) {
  const mock = useMockData();

  const facilitatorAddress = getContractAddress(ContractName.LZ_CROSS_CHAIN_BRIDGE, sourceChainId);
  const sourceGatewayAddress = getContractAddress(ContractName.LZ_BRIDGE_GATEWAY, sourceChainId);
  const destGatewayAddress =
    destinationChainId != null
      ? getContractAddress(ContractName.LZ_BRIDGE_GATEWAY, destinationChainId)
      : undefined;

  const enabled = !mock;

  const { data: facilitatorEnabled, isLoading: l1 } = useReadContract({
    address: facilitatorAddress,
    abi: LZCrossChainBridgeAbi,
    functionName: "isEnabled",
    chainId: sourceChainId,
    query: { enabled: enabled && !!facilitatorAddress, staleTime: 60_000 },
  });

  const { data: sourceGatewayEnabled, isLoading: l2 } = useReadContract({
    address: sourceGatewayAddress,
    abi: LZBridgeGatewayAbi,
    functionName: "isEnabled",
    chainId: sourceChainId,
    query: { enabled: enabled && !!sourceGatewayAddress, staleTime: 60_000 },
  });

  const { data: destReceiveEnabled, isLoading: l3 } = useReadContract({
    address: destGatewayAddress,
    abi: LZBridgeGatewayAbi,
    functionName: "isReceiveEnabled",
    chainId: destinationChainId,
    query: { enabled: enabled && !!destGatewayAddress, staleTime: 60_000 },
  });

  if (mock?.scenario.bridge) {
    const active = mock.scenario.bridge.isActive;
    return {
      sendEnabled: active,
      receiveEnabled: active,
      canBridge: active,
      isLoading: false,
    };
  }

  const sendEnabled = facilitatorEnabled === true && sourceGatewayEnabled === true;
  const receiveEnabled = destGatewayAddress == null ? undefined : destReceiveEnabled === true;
  const canBridge = sendEnabled && receiveEnabled !== false;

  return {
    sendEnabled,
    receiveEnabled,
    canBridge,
    isLoading: l1 || l2 || l3,
  };
}
