import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { Address, Hex } from "viem";

/**
 * A single user's OHM v1 → v2 migration allocation, looked up from the sharded
 * merkle tree (see `scripts/shard-merkle-tree.ts`).
 */
export type MigrationClaim = {
  /** Allocated OHM v1 amount (raw, 9 decimals). Passed to `migrate` as `allocatedAmount`. */
  allocatedAmount: bigint;
  /** Merkle proof for `(address, allocatedAmount)`. */
  proof: Hex[];
};

type ShardClaim = { amount: string; proof: string[] };
type Shard = Record<string, ShardClaim>;

/** Base URL for the claim shards: Vercel Blob in prod, public/migration in local dev. */
function getClaimsBaseUrl(): string {
  const override = import.meta.env.VITE_MIGRATION_CLAIMS_BASE_URL as string | undefined;
  if (override) return override.replace(/\/$/, "");
  // BASE_URL is "/" by default and always ends with a slash.
  return `${import.meta.env.BASE_URL}migration`;
}

async function fetchShard(baseUrl: string, prefix: string): Promise<Shard> {
  const res = await fetch(`${baseUrl}/claims-${prefix}.json`);
  if (res.status === 404) return {};
  if (!res.ok) throw new Error(`Failed to load migration shard ${prefix}: ${res.status}`);
  return (await res.json()) as Shard;
}

/**
 * Look up the connected (or supplied) address's migration claim. The shard for the
 * address prefix is fetched once and cached/shared across all addresses in it.
 */
export function useMigrationClaim(addressOverride?: Address) {
  const { address: connectedAddress } = useAccount();
  const address = addressOverride ?? connectedAddress;
  const lower = address?.toLowerCase();
  const prefix = lower?.slice(2, 4);
  const baseUrl = getClaimsBaseUrl();

  const {
    data: shard,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["migrationClaimShard", baseUrl, prefix],
    queryFn: () => fetchShard(baseUrl, prefix as string),
    enabled: !!prefix,
    staleTime: Infinity,
  });

  const raw = lower && shard ? shard[lower] : undefined;
  const claim: MigrationClaim | null = raw
    ? { allocatedAmount: BigInt(raw.amount), proof: raw.proof as Hex[] }
    : null;

  return {
    claim,
    isEligible: !!claim,
    isLoading,
    error: error as Error | null,
  };
}
