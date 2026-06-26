import { useReadContract } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import LZBridgeGatewayAbi from "@/abis/LZBridgeGateway";
import { getBridgeChain } from "@/modules/ohm/utils/constants";
import { useMockData } from "@/lib/mock/provider";

/**
 * Bridged-supply guard for sends into the canonical chain (Ethereum / Sepolia).
 *
 * On the canonical chain, an inbound transfer decrements `bridgedSupply`. If the received
 * amount exceeds the current bridged supply the destination gateway reverts with
 * `LZBridgeGateway_BridgedSupplyUnderflow` and the message gets stuck. This is rare, but we
 * block it pre-flight. For non-canonical destinations the hook is inert (`hasSufficientSupply`
 * stays true).
 */
export function useBridgedSupply({
  destinationChainId,
  amount,
}: {
  destinationChainId: number;
  amount: bigint;
}) {
  const mock = useMockData();
  const destChain = getBridgeChain(destinationChainId);
  const isCanonicalDest = destChain?.isCanonical === true;

  const gatewayAddress = isCanonicalDest
    ? getContractAddress(ContractName.LZ_BRIDGE_GATEWAY, destinationChainId)
    : undefined;

  const { data: bridgedSupply, isLoading } = useReadContract({
    address: gatewayAddress,
    abi: LZBridgeGatewayAbi,
    functionName: "bridgedSupply",
    chainId: destinationChainId,
    query: { enabled: !mock && !!gatewayAddress, refetchInterval: 30_000 },
  });

  if (!isCanonicalDest || mock) {
    return {
      isCanonicalDest,
      bridgedSupply: undefined,
      hasSufficientSupply: true,
      isLoading: false,
    };
  }

  const hasSufficientSupply =
    amount <= 0n || bridgedSupply == null ? true : amount <= bridgedSupply;

  return { isCanonicalDest, bridgedSupply, hasSufficientSupply, isLoading };
}
