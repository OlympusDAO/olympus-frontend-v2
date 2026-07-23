/** Migration state for the OHM v1 row's action button on the Balances page. */
export type MigrationStatus =
  | "loading"
  | "error"
  | "ineligible"
  | "not-live"
  | "fully-migrated"
  | "ready";

export type MigrationAction = {
  status: MigrationStatus;
  onMigrate: () => void;
};

/** Tooltip for legacy-token actions (unstake/unwrap) shown on rows for chains where the
 * legacy v1 contracts don't exist — the conversion path only lives on Ethereum. */
export const LEGACY_ACTION_TOOLTIP = "Available on Ethereum only.";

/** Tooltip copy for non-actionable migration states. */
export const MIGRATION_TOOLTIP: Partial<Record<MigrationStatus, string>> = {
  error: "Couldn't check your migration eligibility. Refresh to try again.",
  ineligible: "This address isn't in the migration snapshot.",
  "not-live": "Migration isn't live yet.",
  "fully-migrated": "You've migrated your full allocation.",
};

/** Action button config for a Balances row/card. */
export type TokenAction = {
  label: string;
  to?: string;
  disabled?: boolean;
  onClick?: () => void;
  tooltip?: string;
};

/**
 * Resolve the action button for a token row, shared by the desktop table and mobile
 * cards so the two presentations can't drift.
 */
export function getTokenAction(
  symbol: string,
  chainName: string,
  migration?: MigrationAction,
  onUnstakeV1?: () => void,
  onUnwrapWsohm?: () => void,
): TokenAction {
  const isHomeChain = chainName === "Ethereum" || chainName === "Sepolia";
  switch (symbol) {
    case "OHM":
      return isHomeChain
        ? { label: "Wrap", to: "/ohm/wrap" }
        : { label: "Bridge", to: "/ohm/bridge" };
    case "sOHM":
      return { label: "Wrap", to: "/ohm/wrap" };
    case "gOHM":
      return isHomeChain
        ? { label: "Unwrap", to: "/ohm/wrap?mode=unwrap" }
        : { label: "Bridge", to: "/ohm/bridge" };
    case "OHM v1":
      return getMigrateAction(migration);
    case "sOHM v1":
      // Unstake to OHM v1 first; the migrator only accepts OHM v1. The legacy staking
      // contract only exists on Ethereum, so bridged rows stay disabled.
      return isHomeChain && onUnstakeV1
        ? { label: "Unstake", onClick: onUnstakeV1 }
        : {
            label: "Unstake",
            disabled: true,
            tooltip: isHomeChain ? undefined : LEGACY_ACTION_TOOLTIP,
          };
    case "wsOHM":
      // Unwrap to sOHM v1, then unstake to OHM v1, then migrate. The legacy wsOHM
      // contract only unwraps on Ethereum, so bridged rows stay disabled.
      return isHomeChain && onUnwrapWsohm
        ? { label: "Unwrap", onClick: onUnwrapWsohm }
        : {
            label: "Unwrap",
            disabled: true,
            tooltip: isHomeChain ? undefined : LEGACY_ACTION_TOOLTIP,
          };
    default:
      return { label: "View", disabled: true };
  }
}

function getMigrateAction(migration?: MigrationAction): TokenAction {
  if (!migration || migration.status === "loading") return { label: "Migrate", disabled: true };
  if (migration.status === "ready") return { label: "Migrate", onClick: migration.onMigrate };
  return {
    label: migration.status === "fully-migrated" ? "Migrated" : "Migrate",
    disabled: true,
    tooltip: MIGRATION_TOOLTIP[migration.status],
  };
}
