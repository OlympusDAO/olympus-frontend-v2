import { useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import CoolerClearingHouseABI from "@/abis/CoolerClearingHouse";
import CoolerClearingHouseV1ABI from "@/abis/CoolerClearingHouseV1";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import type { ClearingHouseVersion } from "./useGetClearingHouse";

const EXTEND_TOAST: TransactionToastConfig = {
  pending: { title: "Extending loan...", description: "Please wait for confirmation." },
  success: { title: "Loan extended!", description: "Your loan term has been extended." },
  error: {
    title: "Extension failed",
    description: "There was an error extending your loan.",
    userRejected: { title: "Extension cancelled", description: "You cancelled the transaction." },
  },
};

export function useExtendLoan() {
  const queryClient = useQueryClient();

  const { data: hash, writeContract, isPending, error: writeError, reset } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["getCoolerLoans"] });
  }, [queryClient]);

  useTransactionToast({
    hash,
    isWritePending: isPending,
    isConfirmed,
    writeError,
    confirmError,
    config: EXTEND_TOAST,
    onConfirmed: invalidateQueries,
  });

  const extend = ({
    clearingHouseAddress,
    coolerAddress,
    loanId,
    times,
    version,
  }: {
    clearingHouseAddress: Address;
    coolerAddress: Address;
    loanId: number;
    times: number;
    version: ClearingHouseVersion;
  }) => {
    const abi = version === "clearingHouseV3" ? CoolerClearingHouseABI : CoolerClearingHouseV1ABI;
    reset();
    writeContract({
      address: clearingHouseAddress,
      abi,
      functionName: "extendLoan",
      args: [coolerAddress, BigInt(loanId), times],
    });
  };

  return {
    extend,
    isPending: isPending || isConfirming,
    isSuccess: isConfirmed,
    hash,
  };
}
