/** Migration state for the OHM v1 row's action button on the Balances page. */
export type MigrationStatus = "loading" | "ineligible" | "not-live" | "fully-migrated" | "ready";

export type MigrationAction = {
  status: MigrationStatus;
  onMigrate: () => void;
};

/** Tooltip copy for non-actionable migration states. */
export const MIGRATION_TOOLTIP: Partial<Record<MigrationStatus, string>> = {
  ineligible: "This address isn't in the migration snapshot.",
  "not-live": "Migration isn't live yet.",
  "fully-migrated": "You've migrated your full allocation.",
};
