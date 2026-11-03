import { useAccount, useBytecode, useReadContract } from "wagmi";
import { parseAbi } from "viem";
import { classifyWallet, isThresholdAbsent, type WalletKind } from "./walletKind";

const safeAbi = parseAbi(["function getThreshold() view returns (uint256)"]);
const RETRY_UNKNOWN = 15_000;

/**
 * What kind of wallet is connected on a chain. `isSafeApp` means the app is running inside the Safe
 * interface, where the chain is fixed and can't be switched.
 */
export function useSafeContext(chainId: number): { kind: WalletKind; isSafeApp: boolean } {
  const { address, connector } = useAccount();

  const { data: code, isSuccess: codeKnown } = useBytecode({
    address,
    chainId,
    query: {
      enabled: !!address,
      refetchInterval: (query) => (query.state.status === "success" ? false : RETRY_UNKNOWN),
    },
  });
  const { data: threshold, error: thresholdError } = useReadContract({
    address,
    abi: safeAbi,
    functionName: "getThreshold",
    chainId,
    query: {
      enabled: !!code && code !== "0x",
      retry: (failures, error) => !isThresholdAbsent(error) && failures < 3,
      refetchInterval: (query) =>
        query.state.status === "success" || isThresholdAbsent(query.state.error)
          ? false
          : RETRY_UNKNOWN,
    },
  });

  const thresholdState =
    threshold !== undefined ? "found" : isThresholdAbsent(thresholdError) ? "absent" : "unknown";

  return {
    kind: address
      ? classifyWallet({ connectorId: connector?.id, code, codeKnown, threshold: thresholdState })
      : "eoa",
    isSafeApp: connector?.id === "safe",
  };
}
