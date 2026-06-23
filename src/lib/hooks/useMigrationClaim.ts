import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import type { Address, Hex } from "viem";
import { isAddress, zeroHash } from "viem";
import { getMigrationClaimsBaseUrl } from "@/lib/migration-config";

/**
 * A single user's OHM v1 → v2 migration allocation, looked up from the
 * ohm-v1-balances proof API for the active merkle root.
 */
export type MigrationClaim = {
  /** Allocated OHM v1 amount (raw, 9 decimals). Passed to `migrate` as `allocatedAmount`. */
  allocatedAmount: bigint;
  /** Merkle proof for `(address, allocatedAmount)`. */
  proof: Hex[];
};

type ProofResponse = {
  address: string;
  amount: string;
  merkleRoot: string;
  proof: string[];
};

function normalizeClaim(
  response: ProofResponse,
  expectedMerkleRoot: Hex,
  expectedAddress: Address,
): MigrationClaim {
  if (!isAddress(response.address)) {
    throw new Error("Migration proof response contained an invalid address.");
  }
  if (response.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error("Migration proof response address did not match the connected wallet.");
  }
  if (response.merkleRoot.toLowerCase() !== expectedMerkleRoot.toLowerCase()) {
    throw new Error("Migration proof response merkle root did not match the active root.");
  }

  return {
    allocatedAmount: BigInt(response.amount),
    proof: response.proof as Hex[],
  };
}

async function fetchClaim(baseUrl: string, merkleRoot: Hex, address: Address) {
  const res = await fetch(`${baseUrl}/proof/${merkleRoot}/${address}/`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load migration proof: ${res.status}`);
  return (await res.json()) as ProofResponse;
}

/** Look up the connected wallet's migration claim from the root-scoped proof API. */
export function useMigrationClaim(merkleRoot?: Hex) {
  const { address } = useAccount();
  const baseUrl = getMigrationClaimsBaseUrl();
  const hasMerkleRoot = !!merkleRoot && merkleRoot !== zeroHash;
  const enabled = hasMerkleRoot && !!address;

  const {
    data: claim,
    isLoading,
    error,
    isFetched,
  } = useQuery({
    queryKey: ["migrationClaim", baseUrl, merkleRoot, address],
    queryFn: () => fetchClaim(baseUrl, merkleRoot as Hex, address as Address),
    enabled,
    select: (response) =>
      response ? normalizeClaim(response, merkleRoot as Hex, address as Address) : null,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!enabled || isLoading) return;

    if (error) {
      console.warn("[V1Migrator] Failed to load migration claim", {
        address,
        merkleRoot,
        claimsBaseUrl: baseUrl,
        error,
      });
      return;
    }

    if (isFetched && !claim) {
      console.info("[V1Migrator] No migration claim found", {
        address,
        merkleRoot,
        claimsBaseUrl: baseUrl,
      });
    }
  }, [address, baseUrl, claim, enabled, error, isFetched, isLoading, merkleRoot]);

  return {
    claim: claim ?? null,
    isEligible: !!claim,
    isLoading,
    error: error as Error | null,
  };
}
