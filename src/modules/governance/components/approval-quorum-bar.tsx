import { cn } from "@/lib/utils";

/**
 * Three-segment progress bar with a threshold tick marker.
 *
 * The bar shows For (green), Against (red), and remaining (gray) segments.
 * A vertical tick marks the threshold position on the bar.
 * The header shows "actual% / threshold%" with the actual in white and threshold in gray.
 */
export function ApprovalQuorumBar({
  label,
  percentage,
  threshold,
  forPercent,
  againstPercent,
  thresholdMet,
  className,
}: {
  /** Label text (e.g. "Approval", "Quorum") */
  label?: string;
  /** The main percentage value (e.g. approval % or quorum %) */
  percentage: number;
  /** The threshold percentage where the tick marker appears (e.g. 60 for approval, 20 for quorum) */
  threshold: number;
  /** Percentage of the bar filled by "For" votes */
  forPercent: number;
  /** Percentage of the bar filled by "Against" votes */
  againstPercent: number;
  /** Whether the threshold has been met */
  thresholdMet: boolean;
  className?: string;
}) {
  const clampedFor = Math.min(Math.max(forPercent, 0), 100);
  const clampedAgainst = Math.min(Math.max(againstPercent, 0), 100 - clampedFor);
  const clampedThreshold = Math.min(Math.max(threshold, 0), 100);

  return (
    <div data-slot="approval-quorum-bar" className={cn("flex flex-col gap-1", className)}>
      {/* Header: label actual% / threshold% */}
      <div className="flex items-baseline gap-1 text-sm">
        {label && <span className="font-medium text-primary-t">{label}</span>}
        <span className={cn("font-semibold", thresholdMet ? "text-primary-t" : "text-primary-t")}>
          {Math.round(percentage)}%
        </span>
        <span className="text-secondary-t">/ {Math.round(clampedThreshold)}%</span>
      </div>

      {/* Bar with three segments + threshold tick */}
      <div className="relative">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-a5">
          {/* For segment (green) */}
          {clampedFor > 0 && (
            <div
              className={cn(
                "h-full transition-all duration-300",
                thresholdMet ? "bg-green-500" : "bg-green-500/60",
              )}
              style={{ width: `${clampedFor}%` }}
            />
          )}
          {/* Against segment (red) */}
          {clampedAgainst > 0 && (
            <div
              className="h-full bg-red-500/60 transition-all duration-300"
              style={{ width: `${clampedAgainst}%` }}
            />
          )}
        </div>

        {/* Threshold tick marker */}
        {clampedThreshold > 0 && clampedThreshold < 100 && (
          <div
            className="absolute top-[-3px] flex flex-col items-center"
            style={{ left: `${clampedThreshold}%`, transform: "translateX(-50%)" }}
          >
            <div className="h-3.5 w-0.5 rounded-full bg-primary-t/60" />
          </div>
        )}
      </div>
    </div>
  );
}
