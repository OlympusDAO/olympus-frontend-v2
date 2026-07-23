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
