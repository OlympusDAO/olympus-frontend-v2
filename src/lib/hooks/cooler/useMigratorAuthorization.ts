import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getContractAddress, ContractName } from "@/lib/contracts";
import CoolerV2MonoCoolerABI from "@/abis/CoolerV2MonoCooler";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";

const AUTH_TOAST: TransactionToastConfig = {
  pending: { title: "Authorizing migrator...", description: "Please wait for confirmation." },
  success: { title: "Migrator authorized!", description: "You can now proceed with migration." },
  error: {
    title: "Authorization failed",
    description: "There was an error authorizing the migrator.",
    userRejected: {
      title: "Authorization cancelled",
      description: "You cancelled the transaction.",
    },
  },
};

export function useMigratorAuthorization() {
  const { address } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();

  const monoCoolerAddress = getContractAddress(ContractName.COOLER_V2_MONOCOOLER, chainId);
  const migratorAddress = getContractAddress(ContractName.COOLER_V2_MIGRATOR, chainId);

  const {
    data: authDeadline,
    isLoading: isCheckingAuthorization,
    queryKey,
  } = useReadContract({
    address: monoCoolerAddress,
    abi: CoolerV2MonoCoolerABI,
    functionName: "authorizations",
    args: address && migratorAddress ? [address, migratorAddress] : undefined,
    query: {
      enabled: !!address && !!migratorAddress,
      refetchInterval: 600000,
    },
  });

  const isAuthorized =
    authDeadline !== undefined && (authDeadline as bigint) > BigInt(Math.floor(Date.now() / 1000));

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
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  useTransactionToast({
    hash,
    isWritePending: isPending,
    isConfirmed,
    writeError,
    confirmError,
    config: AUTH_TOAST,
    onConfirmed: invalidateQueries,
  });

  const setAuthorization = () => {
    if (!monoCoolerAddress || !migratorAddress) return;
    const deadline = Math.floor(Date.now() / 1000) + 72 * 60 * 60;
    reset();
    writeContract({
      address: monoCoolerAddress,
      abi: CoolerV2MonoCoolerABI,
      functionName: "setAuthorization",
      args: [migratorAddress, BigInt(deadline)],
    });
  };

  return {
    isAuthorized,
    isCheckingAuthorization,
    setAuthorization,
    isSettingAuthorization: isPending || isConfirming,
    migratorAddress,
  };
}
