import type { Hex } from "viem";

const PRODUCTION_MIGRATION_CLAIMS_BASE_URL = "https://ohm-v1-balances-api.olympusdao.finance";

function getOptionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function getMigrationClaimsBaseUrl(): string {
  const override = getOptionalEnv(
    import.meta.env.VITE_MIGRATION_CLAIMS_BASE_URL as string | undefined,
  );
  return (override ?? PRODUCTION_MIGRATION_CLAIMS_BASE_URL).replace(/\/$/, "");
}

export function getMigrationMerkleRootOverride(): Hex | undefined {
  return getOptionalEnv(
    import.meta.env.VITE_MIGRATION_MERKLE_ROOT_OVERRIDE as string | undefined,
  ) as Hex | undefined;
}
