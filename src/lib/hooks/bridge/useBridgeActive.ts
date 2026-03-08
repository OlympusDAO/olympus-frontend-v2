import { useReadContract } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import CrossChainBridgeAbi from "@/abis/CrossChainBridge";
import { useMockData } from "@/lib/mock/provider";

export function useBridgeActive(chainId: number) {
  const mock = useMockData();
  const bridgeAddress = getContractAddress(ContractName.CROSS_CHAIN_BRIDGE, chainId);

  const { data, isLoading } = useReadContract({
    address: bridgeAddress,
    abi: CrossChainBridgeAbi,
    functionName: "bridgeActive",
    chainId,
    query: {
      enabled: !mock && !!bridgeAddress,
      staleTime: 60_000,
    },
  });

  if (mock?.scenario.bridge) {
    return {
      isActive: mock.scenario.bridge.isActive,
      isLoading: false,
    };
  }

  return {
    isActive: data as boolean | undefined,
    isLoading,
  };
}
