import { useEffect, useMemo } from "react";
import { useAccount, useChainId, useReadContract, useReadContracts } from "wagmi";
import type { Hex } from "viem";
import { zeroHash } from "viem";
import { ContractName, getContractAddress } from "@/lib/contracts";
import V1MigratorAbi from "@/abis/V1Migrator";
import { getMigrationMerkleRootOverride } from "@/lib/migration-config";

export function useV1MigratorMerkleRoot() {
  const chainId = useChainId();
  const migrator = getContractAddress(ContractName.OHM_V1_MIGRATOR, chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: migrator,
    abi: V1MigratorAbi,
    functionName: "merkleRoot",
    query: { enabled: !!migrator },
  });

  const onChainMerkleRoot = data as Hex | undefined;
  const merkleRootOverride = getMigrationMerkleRootOverride();
  const merkleRoot = merkleRootOverride ?? onChainMerkleRoot;
  const hasMerkleRoot = !!merkleRoot && merkleRoot !== zeroHash;
  const isOnChainMerkleRootActive =
    hasMerkleRoot && onChainMerkleRoot?.toLowerCase() === merkleRoot.toLowerCase();

  useEffect(() => {
    if (!merkleRootOverride) return;
    console.info("[V1Migrator] Using VITE_MIGRATION_MERKLE_ROOT_OVERRIDE", merkleRootOverride);
  }, [merkleRootOverride]);

  useEffect(() => {
    if (isLoading || error || !migrator || hasMerkleRoot) return;
    console.warn("[V1Migrator] No merkle root is set on the migrator", {
      migrator,
      onChainMerkleRoot,
    });
  }, [error, hasMerkleRoot, isLoading, migrator, onChainMerkleRoot]);

  useEffect(() => {
    if (!error) return;
    console.warn("[V1Migrator] Failed to load migrator merkle root", { migrator, error });
  }, [error, migrator]);

  return {
    migrator,
    merkleRoot,
    onChainMerkleRoot,
    hasMerkleRoot,
    isOnChainMerkleRootActive,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * On-chain status for the OHM v1 migrator, scoped to the connected user.
 * Combines the migrator's enabled state, the user's already-migrated amount,
 * the global remaining mint approval, and (when a claim is supplied) on-chain
 * proof verification.
 */
export function useV1MigrationInfo(
  claim?: { allocatedAmount: bigint; proof: Hex[] } | null,
  shouldVerifyClaim = true,
) {
  const { address } = useAccount();
  const chainId = useChainId();
  const migrator = getContractAddress(ContractName.OHM_V1_MIGRATOR, chainId);

  const contracts = useMemo(() => {
    if (!migrator) return [];
    const base = [
      {
        address: migrator,
        abi: V1MigratorAbi,
        functionName: "isEnabled" as const,
      },
      {
        address: migrator,
        abi: V1MigratorAbi,
        functionName: "isActive" as const,
      },
      {
        address: migrator,
        abi: V1MigratorAbi,
        functionName: "remainingMintApproval" as const,
      },
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
      ...(address && claim && shouldVerifyClaim
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
  }, [migrator, address, claim, shouldVerifyClaim]);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const isEnabled = data?.[0]?.result as boolean | undefined;
  const isActive = data?.[1]?.result as boolean | undefined;
  const remainingMintApproval = data?.[2]?.result as bigint | undefined;
  const migratedAmount = (address ? (data?.[3]?.result as bigint | undefined) : undefined) ?? 0n;
  // verifyClaim is the 5th contract, only present when both address and claim exist
  // and the active merkle root is also set on-chain. A reverted call means the claim
  // could not be verified, so fail closed rather than letting `undefined` read as
  // "not rejected" downstream.
  const verifyClaimCall = address && claim && shouldVerifyClaim ? data?.[4] : undefined;
  const isClaimValid =
    verifyClaimCall == null
      ? undefined
      : verifyClaimCall.status === "failure"
        ? false
        : (verifyClaimCall.result as boolean | undefined);

  const remaining = claim != null ? bigMax(claim.allocatedAmount - migratedAmount, 0n) : undefined;

  useEffect(() => {
    if (isLoading || !migrator || !address) return;

    if (error) {
      console.warn("[V1Migrator] Failed to load migration contract state", {
        migrator,
        address,
        error,
      });
      return;
    }

    if (isEnabled === false || isActive === false) {
      console.warn("[V1Migrator] Migrator is not currently live", {
        migrator,
        isEnabled,
        isActive,
      });
    }

    if (claim && !shouldVerifyClaim) {
      console.info("[V1Migrator] Skipping on-chain claim verification until root is set", {
        migrator,
        address,
        allocatedAmount: claim.allocatedAmount.toString(),
        proofLength: claim.proof.length,
      });
    }

    if (verifyClaimCall?.status === "failure") {
      console.warn("[V1Migrator] verifyClaim call reverted; treating claim as invalid", {
        migrator,
        address,
        error: verifyClaimCall.error,
      });
    } else if (claim && shouldVerifyClaim && isClaimValid === false) {
      console.warn("[V1Migrator] Migration claim failed on-chain verification", {
        migrator,
        address,
        allocatedAmount: claim.allocatedAmount.toString(),
        proofLength: claim.proof.length,
      });
    }
  }, [
    address,
    claim,
    error,
    isActive,
    isClaimValid,
    isEnabled,
    isLoading,
    migrator,
    shouldVerifyClaim,
    verifyClaimCall,
  ]);

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
