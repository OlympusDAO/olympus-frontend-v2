import { useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { type Address } from "viem";
import CoolerABI from "@/abis/Cooler";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";

const REPAY_TOAST: TransactionToastConfig = {
  pending: { title: "Repaying loan...", description: "Please wait for confirmation." },
  success: { title: "Repayment successful!", description: "Your loan has been repaid." },
  error: {
    title: "Repayment failed",
    description: "There was an error repaying your loan.",
    userRejected: { title: "Repayment cancelled", description: "You cancelled the transaction." },
  },
};

export function useRepayLegacyLoan() {
  const queryClient = useQueryClient();

  const { data: hash, writeContract, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({
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
    config: REPAY_TOAST,
    onConfirmed: invalidateQueries,
  });

  const repay = (coolerAddress: Address, loanId: number, amount: bigint) => {
    reset();
    writeContract({
      address: coolerAddress,
      abi: CoolerABI,
      functionName: "repayLoan",
      args: [BigInt(loanId), amount],
    });
  };

  return {
    repay,
    isPending: isPending || isConfirming,
    isSuccess: isConfirmed,
    hash,
  };
}
