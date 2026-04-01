import type { EpochsEpoch } from "@/generated/olympusUnits";

export type EpochStatus = "distributed" | "calculated" | "not_submitted" | "active";

export function deriveEpochStatus(epoch: EpochsEpoch): EpochStatus {
  if (epoch.status === "active") return "active";
  const rs = epoch.rewardStatuses ?? [];
  if (rs.includes("distributed")) return "distributed";
  if (rs.includes("calculated")) return "calculated";
  return "not_submitted";
}
