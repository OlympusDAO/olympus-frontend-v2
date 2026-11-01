import { useAccount, useBytecode, useReadContract } from "wagmi";
import { parseAbi } from "viem";
import { classifyWallet, type WalletKind } from "./walletKind";

const safeAbi = parseAbi(["function getThreshold() view returns (uint256)"]);

/**
 * What kind of wallet is connected on a chain. `isSafeApp` means the app is running inside the Safe
 * interface, where the chain is fixed and can't be switched.
 */
export function useSafeContext(chainId: number): {
  kind: WalletKind;
  isSafeApp: boolean;
  threshold?: number;
} {
  const { address, connector } = useAccount();
  const { data: code } = useBytecode({ address, chainId, query: { enabled: !!address } });
  const { data: threshold } = useReadContract({
    address,
    abi: safeAbi,
    functionName: "getThreshold",
    chainId,
    query: { enabled: !!code && code !== "0x", retry: false },
  });

  return {
    kind: classifyWallet({
      connectorId: connector?.id,
      code,
      hasThreshold: threshold !== undefined,
    }),
    isSafeApp: connector?.id === "safe",
    threshold: threshold === undefined ? undefined : Number(threshold),
  };
}
