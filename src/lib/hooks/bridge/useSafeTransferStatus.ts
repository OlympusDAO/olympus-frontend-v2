import { useQuery } from "@tanstack/react-query";
import type { Hex } from "viem";
import { fetchSafeTx } from "./safeService";

/** Signing progress of a proposed Safe transaction. */
export function useSafeTransferStatus(chainId: number, safeTxHash?: Hex) {
  const { data } = useQuery({
    queryKey: ["safeTx", chainId, safeTxHash],
    enabled: !!safeTxHash,
    queryFn: () => fetchSafeTx(chainId, safeTxHash as Hex),
    refetchInterval: (query) => (query.state.data?.isExecuted ? false : 15_000),
    retry: false,
  });
  return {
    confirmations: data?.confirmations?.length,
    required: data?.confirmationsRequired,
    isExecuted: data?.isExecuted,
    isSuccessful: data?.isSuccessful,
  };
}
