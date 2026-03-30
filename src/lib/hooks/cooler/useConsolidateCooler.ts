import { useCallback } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { type Address } from "viem";
import { getContractAddress, ContractName } from "@/lib/contracts";
import CoolerV2MigratorABI from "@/abis/CoolerV2Migrator";
import CoolerV2MonoCoolerABI from "@/abis/CoolerV2MonoCooler";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import { useIsSmartContractWallet } from "./useIsSmartContractWallet";
import { useMigratorAuthorization } from "./useMigratorAuthorization";
import {
  getAuthorizationSignature,
  EMPTY_AUTH,
  EMPTY_SIGNATURE,
} from "./getAuthorizationSignature";

const MIGRATE_TOAST: TransactionToastConfig = {
  pending: { title: "Migrating to Cooler V2...", description: "Please wait for confirmation." },
  success: { title: "Migration successful!", description: "Your loans have been migrated to Cooler V2." },
  error: {
    title: "Migration failed",
    description: "There was an error migrating your loans.",
    userRejected: { title: "Migration cancelled", description: "You cancelled the transaction." },
  },
};

export function useConsolidateCooler() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { signTypedDataAsync } = useSignTypedData();
  const { isSmartContractWallet } = useIsSmartContractWallet();
  const { isAuthorized: isMigratorAuthorized } = useMigratorAuthorization();

  const monoCoolerAddress = getContractAddress(ContractName.COOLER_V2_MONOCOOLER, chainId);
  const migratorAddress = getContractAddress(ContractName.COOLER_V2_MIGRATOR, chainId);

  // Read nonce for EIP-712 signatures
  const { data: authNonce } = useReadContract({
    address: monoCoolerAddress,
    abi: CoolerV2MonoCoolerABI,
    functionName: "authorizationNonces",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: hash, writeContract, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["getCoolerLoans"] });
    queryClient.invalidateQueries({ queryKey: ["monoCoolerPosition"] });
  }, [queryClient]);

  useTransactionToast({
    hash,
    isWritePending: isPending,
    isConfirmed,
    writeError,
    confirmError,
    config: MIGRATE_TOAST,
    onConfirmed: invalidateQueries,
  });

  // Preview consolidation to show user what will happen
  const previewConsolidate = async (coolers: Address[]) => {
    if (!publicClient || !migratorAddress) throw new Error("Missing contract addresses");

    const result = await publicClient.readContract({
      address: migratorAddress,
      abi: CoolerV2MigratorABI,
      functionName: "previewConsolidate",
      args: [coolers],
    });

    const [collateralAmount, borrowAmount] = result as readonly [bigint, bigint];
    return { collateralAmount, borrowAmount };
  };

  // Main consolidation function
  const consolidate = async ({
    coolers,
    newOwner,
    isAuthorized = false,
  }: {
    coolers: Address[];
    newOwner: Address;
    isAuthorized?: boolean;
  }) => {
    if (!migratorAddress || !monoCoolerAddress || !address) return;

    reset();

    if (isAuthorized) {
      writeContract({
        address: migratorAddress,
        abi: CoolerV2MigratorABI,
        functionName: "consolidate",
        args: [coolers, newOwner, EMPTY_AUTH, EMPTY_SIGNATURE, []],
      });
      return;
    }

    // EOA: generate EIP-712 signature
    const nonce = authNonce ?? 0n;
    const { auth, signature } = await getAuthorizationSignature({
      userAddress: address,
      authorizedAddress: migratorAddress,
      verifyingContract: monoCoolerAddress,
      chainId,
      nonce: nonce as bigint,
      signTypedDataAsync,
    });

    writeContract({
      address: migratorAddress,
      abi: CoolerV2MigratorABI,
      functionName: "consolidate",
      args: [coolers, newOwner, auth, signature, []],
    });
  };

  return {
    consolidate,
    previewConsolidate,
    isPending: isPending || isConfirming,
    isSuccess: isConfirmed,
    hash,
    isSmartContractWallet,
    isMigratorAuthorized,
  };
}
