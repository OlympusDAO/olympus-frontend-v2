import { useMemo } from "react";
import { useAccount, useChainId, useReadContracts } from "wagmi";
import type { Hex } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import V1MigratorAbi from "@/abis/V1Migrator";

/**
 * On-chain status for the OHM v1 migrator, scoped to the connected user.
 * Combines the migrator's enabled state, the user's already-migrated amount,
 * the global remaining mint approval, and (when a claim is supplied) on-chain
 * proof verification.
 */
export function useV1MigrationInfo(claim?: { allocatedAmount: bigint; proof: Hex[] } | null) {
  const { address } = useAccount();
  const chainId = useChainId();
  const migrator = getContractAddress(ContractName.OHM_V1_MIGRATOR, chainId);

  const contracts = useMemo(() => {
    if (!migrator) return [];
    const base = [
      { address: migrator, abi: V1MigratorAbi, functionName: "isEnabled" as const },
      { address: migrator, abi: V1MigratorAbi, functionName: "isActive" as const },
      { address: migrator, abi: V1MigratorAbi, functionName: "remainingMintApproval" as const },
      ...(address
        ? [
            {
              address: migrator,
              abi: V1MigratorAbi,
              functionName: "migratedAmounts" as const,
              args: [address] as const,
            },
          ]
        : []),
      ...(address && claim
        ? [
            {
              address: migrator,
              abi: V1MigratorAbi,
              functionName: "verifyClaim" as const,
              args: [address, claim.allocatedAmount, claim.proof] as const,
            },
          ]
        : []),
    ];
    return base;
  }, [migrator, address, claim]);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const isEnabled = data?.[0]?.result as boolean | undefined;
  const isActive = data?.[1]?.result as boolean | undefined;
  const remainingMintApproval = data?.[2]?.result as bigint | undefined;
  const migratedAmount = (address ? (data?.[3]?.result as bigint | undefined) : undefined) ?? 0n;
  // verifyClaim is the 5th contract, only present when both address and claim exist.
  const isClaimValid = address && claim ? (data?.[4]?.result as boolean | undefined) : undefined;

  const remaining = claim != null ? bigMax(claim.allocatedAmount - migratedAmount, 0n) : undefined;

  return {
    migrator,
    isEnabled,
    isActive,
    migratedAmount,
    remainingMintApproval,
    isClaimValid,
    /** Remaining allocation = allocated − already migrated (only when a claim is supplied). */
    remaining,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

function bigMax(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}
