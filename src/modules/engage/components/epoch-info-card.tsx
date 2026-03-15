import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/icon";
import { NumberFlow } from "@/components/ui/number-flow";
import type { EpochStatus, MockEpoch } from "./rewards-manager-mock";
import { Separator } from "@/components/ui/separator.tsx";

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
  epoch: MockEpoch;
}

export function EpochInfoCard({ epoch }: EpochInfoCardProps) {
  const badge = STATUS_BADGE[epoch.status];
  const isSubmittable = epoch.status === "not_submitted";

  return (
    <Card className="p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[18px]/[24px] font-semibold text-primary-t mb-3">
          Epoch {epoch.number}
        </span>
        <Badge color={badge.color} size="md">
          {badge.label}
        </Badge>
      </div>

      {/* Description (not_submitted only) */}
      {epoch.status === "not_submitted" && (
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
      <Separator className="my-4" />

      {/* Stats */}
      <div className="flex flex-col">
        <StatRow
          label="Drachmas Accumulated"
          icon="drachmaTokenIcon"
          value={epoch.drachmasAccumulated}
        />
        <Separator className="my-4" />
        <StatRow
          label="CD Yield Generated"
          icon="USDSColorTokenIcon"
          value={epoch.cdYieldGenerated}
        />
        <Separator className="my-4" />
        <StatRow label="iOHM to Distribute" icon="iOHMTokenIcon" value={epoch.iOHMToDistribute} />
      </div>

      {/* 3-col info row */}
      <div className="grid grid-cols-3 border border-a3-b bg-surface-a3 rounded-xl overflow-hidden mt-3">
        <InfoCell
          label="Strike Price"
          value={epoch.strikePrice > 0 ? `$${epoch.strikePrice}` : "—"}
        />
        <InfoCell label="Eligible" value={epoch.eligibleDate} border />
        <InfoCell label="Expiry Date" value={epoch.expiryDate} border />
      </div>

      {/* Submit Proposal */}
      <Button variant="default" size="md" disabled={!isSubmittable} className="w-full mt-4">
        Submit Proposal
      </Button>
    </Card>
  );
}

function StatRow({
  label,
  icon,
  value,
  prefix = "",
}: {
  label: string;
  icon: IconName;
  value: number;
  prefix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[15px]/[20px] font-semibold">{label}</span>
      <div className="flex items-center gap-1.5">
        <Icon name={icon} className="size-4" />
        <NumberFlow
          prefix={prefix}
          value={value}
          format={{ style: "decimal", notation: "standard", maximumFractionDigits: 2 }}
          className="text-[15px]/[20px] font-semibold"
        />
      </div>
    </div>
  );
}

function InfoCell({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center gap-0.5 p-3 ${border ? "border-l border-a5-b" : ""}`}
    >
      <span className="text-[12px]/[16px] text-secondary-t">{label}</span>
      <span className="text-[12px]/[16px] font-semibold">{value}</span>
    </div>
  );
}
