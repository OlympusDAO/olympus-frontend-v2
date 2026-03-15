import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { NumberFlow } from "@/components/ui/number-flow";
import { Separator } from "@/components/ui/separator.tsx";
import type { EpochsEpoch, EpochsEpochReward } from "@/generated/olympusUnits";
import { SharedEpochRewardsStatus } from "@/generated/olympusUnits";
import { deriveEpochStatus, type EpochStatus } from "../lib/derive-epoch-status";
import { useSubmitProposal } from "@/lib/hooks/useSubmitProposal";

function formatEpochDate(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ts * 1000));
}

function formatEpochTime(ts: number): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(new Date(ts * 1000)) + " UTC"
  );
}

const STATUS_BADGE: Record<EpochStatus, { color: "green" | "orange" | "gray"; label: string }> = {
  distributed: { color: "green", label: "Distributed" },
  calculated: { color: "orange", label: "Calculated" },
  not_submitted: { color: "gray", label: "Not Submitted" },
  active: { color: "gray", label: "Active" },
};

interface EpochInfoCardProps {
  epoch: EpochsEpoch | undefined;
  reward: EpochsEpochReward | null;
}

export function EpochInfoCard({ epoch, reward }: EpochInfoCardProps) {
  const [safeUrl, setSafeUrl] = useState<string | undefined>(undefined);
  const { execute, isPending } = useSubmitProposal(reward?.id ?? 0);

  if (!epoch) return null;

  const status = deriveEpochStatus(epoch);
  const badge = STATUS_BADGE[status];

  const isSubmittable = reward?.status === SharedEpochRewardsStatus.calculated;
  const rewardAmount =
    reward != null ? parseFloat(reward.rewardAmount) / 10 ** reward.tokenDecimals : null;

  const merkleRoot =
    reward?.merkleRoot && typeof reward.merkleRoot === "string"
      ? `${reward.merkleRoot.slice(0, 10)}…${reward.merkleRoot.slice(-8)}`
      : null;

  const txUrl =
    safeUrl ?? (reward?.safeUrl && typeof reward.safeUrl === "string" ? reward.safeUrl : null);

  async function handleSubmit() {
    try {
      const result = await execute();
      if (result?.safeUrl) setSafeUrl(result.safeUrl);
    } catch {
      // error handled by wagmi/query
    }
  }

  return (
    <Card className="p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[18px]/[24px] font-semibold text-primary-t mb-3">
          Epoch {epoch.epochNumber}
        </span>
        <Badge color={badge.color} size="md">
          {badge.label}
        </Badge>
      </div>

      {/* Description (not_submitted only) */}
      {status === "not_submitted" && (
        <p className="text-[15px]/[20px]">
          You need to submit the proposal to initiate incentive distribution to the users.
        </p>
      )}

      {/* Epoch Period */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[15px]/[20px] font-semibold">Epoch Period</span>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-surface-a3 border border-a3-b rounded-xl p-3 flex flex-col items-center gap-0.5">
            <span className="text-[12px]/[16px] font-semibold">
              {formatEpochDate(epoch.startTimestamp)}
            </span>
            <span className="text-[12px]/[16px] text-secondary-t">
              {formatEpochTime(epoch.startTimestamp)}
            </span>
          </div>
          <span className="text-secondary-t text-sm shrink-0">—</span>
          <div className="flex-1 bg-surface-a3 border border-a3-b rounded-xl p-3 flex flex-col items-center gap-0.5">
            <span className="text-[12px]/[16px] font-semibold">
              {formatEpochDate(epoch.endTimestamp)}
            </span>
            <span className="text-[12px]/[16px] text-secondary-t">
              {formatEpochTime(epoch.endTimestamp)}
            </span>
          </div>
        </div>
      </div>

      {rewardAmount != null && (
        <>
          <Separator className="my-4" />
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[15px]/[20px] font-semibold">iOHM to Distribute</span>
              <div className="flex items-center gap-1.5">
                <Icon name="iOHMTokenIcon" className="size-4" />
                <NumberFlow
                  value={rewardAmount}
                  format={{ style: "decimal", notation: "standard", maximumFractionDigits: 2 }}
                  className="text-[15px]/[20px] font-semibold"
                />
              </div>
            </div>

            {merkleRoot && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px]/[20px] font-semibold">Merkle Root</span>
                <span className="font-mono text-[13px]/[18px] text-secondary-t">{merkleRoot}</span>
              </div>
            )}

            {txUrl && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px]/[20px] font-semibold">Safe TX</span>
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px]/[18px] text-primary-t hover:underline truncate max-w-[160px]"
                >
                  View in Safe ↗
                </a>
              </div>
            )}
          </div>
        </>
      )}

      {/* Submit Proposal / View in Safe */}
      {txUrl ? (
        <a href={txUrl} target="_blank" rel="noopener noreferrer" className="mt-4">
          <Button variant="default" size="md" className="w-full">
            View in Safe
          </Button>
        </a>
      ) : (
        <Button
          variant="default"
          size="md"
          disabled={!isSubmittable || isPending}
          className="w-full mt-4"
          onClick={handleSubmit}
        >
          {isPending ? "Submitting…" : "Submit Proposal"}
        </Button>
      )}
    </Card>
  );
}
