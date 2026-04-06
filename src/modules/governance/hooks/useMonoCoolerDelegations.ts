import { useEffect, useRef } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseUnits, type Address } from "viem";
import CoolerV2MonoCoolerABI from "@/abis/CoolerV2MonoCooler";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { mainnet } from "@/lib/chains";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";

export type AccountDelegation = {
  delegate: Address;
  amount: bigint;
  escrow: Address;
};

export type DelegationRequest = {
  delegate: Address;
  amount: bigint; // int256: positive = delegate more, negative = undelegate
};

/**
 * Fetches current delegations and provides a mutation to apply delegation changes
 * for the MonoCooler (Cooler V2) contract.
 */
export function useMonoCoolerDelegations() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const monoCoolerAddress = getContractAddress(ContractName.COOLER_V2_MONOCOOLER, mainnet.id);

  // Fetch current delegations
  const {
    data: rawDelegations,
    isLoading: delegationsLoading,
    queryKey: delegationsQueryKey,
  } = useReadContract({
    address: monoCoolerAddress,
    abi: CoolerV2MonoCoolerABI,
    functionName: "accountDelegationsList",
    args: address ? [address, 0n, 100n] : undefined,
    chainId: mainnet.id,
    query: {
      enabled: !!address && !!monoCoolerAddress,
    },
  });

  const delegations: AccountDelegation[] | undefined = rawDelegations
    ? (rawDelegations as readonly { delegate: Address; amount: bigint; escrow: Address }[]).map(
        (d) => ({
          delegate: d.delegate,
          amount: d.amount,
          escrow: d.escrow,
        }),
      )
    : undefined;

  // Write contract for applying delegations
  const requestsRef = useRef<DelegationRequest[]>([]);

  const {
    data: hash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  useEffect(() => {
    if (isConfirmed) {
      queryClient.invalidateQueries({ queryKey: delegationsQueryKey });
      queryClient.invalidateQueries({ queryKey: [{ entity: "readContract" }] });
    }
  }, [isConfirmed, queryClient, delegationsQueryKey]);

  const toastConfig: TransactionToastConfig = {
    pending: {
      title: "Applying delegation changes...",
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: "Delegations updated.",
      description: "Your Cooler V2 delegation changes have been applied.",
    },
    error: {
      title: "Delegation failed",
      description: "There was an error updating delegations. Please try again.",
      userRejected: {
        title: "Transaction cancelled",
        description: "You cancelled the delegation transaction.",
      },
    },
  };

  const { reset: resetToast } = useTransactionToast({
    hash,
    isWritePending,
    isConfirmed,
    writeError,
    confirmError,
    config: toastConfig,
  });

  const applyDelegations = (requests: DelegationRequest[]) => {
    if (!monoCoolerAddress || !address || requests.length === 0) return;

    resetWrite();
    resetToast();
    requestsRef.current = requests;

    writeContract({
      address: monoCoolerAddress,
      abi: CoolerV2MonoCoolerABI,
      functionName: "applyDelegations",
      args: [requests.map((r) => ({ delegate: r.delegate, amount: r.amount })), address],
      chainId: mainnet.id,
    });
  };

  const reset = () => {
    resetWrite();
    resetToast();
  };

  return {
    delegations,
    delegationsLoading,
    applyDelegations,
    isPending: isWritePending || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || confirmError,
    hash,
    reset,
  };
}

/**
 * Computes delta-based delegation requests by comparing current on-chain
 * delegations with desired delegations.
 */
export function computeDelegationDeltas(
  currentDelegations: AccountDelegation[],
  desiredDelegations: { address: string; amount: string }[],
): DelegationRequest[] {
  const currentMap = new Map(currentDelegations.map((d) => [d.delegate.toLowerCase(), d.amount]));

  const desiredMap = new Map(
    desiredDelegations
      .filter((d) => d.address && d.amount && !isNaN(Number(d.amount)) && Number(d.amount) > 0)
      .map((d) => [d.address.toLowerCase(), parseUnits(d.amount, 18)]),
  );

  const allAddresses = new Set([...currentMap.keys(), ...desiredMap.keys()]);
  const requests: DelegationRequest[] = [];

  for (const addr of allAddresses) {
    const current = currentMap.get(addr) ?? 0n;
    const desired = desiredMap.get(addr) ?? 0n;
    const delta = desired - current;

    if (delta !== 0n) {
      requests.push({
        delegate: addr as Address,
        amount: delta,
      });
    }
  }

  // Sort: undelegations first (negative amounts), then delegations
  requests.sort((a, b) => {
    if (a.amount < 0n && b.amount >= 0n) return -1;
    if (a.amount >= 0n && b.amount < 0n) return 1;
    return 0;
  });

  return requests;
}
