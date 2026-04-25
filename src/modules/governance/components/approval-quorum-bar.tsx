import React from "react";
import { cn } from "@/lib/utils";

const TOTAL_CELLS = 10;

type ApprovalQuorumBarProps = {
  label?: string;
  icon?: React.ReactNode;
  percentage: number;
  threshold: number;
  forPercent: number;
  againstPercent: number;
  className?: string;
};

/**
 * Segmented progress bar split into 10 equal-width cells with a 1px gap at the
 * threshold position. Cells fill left-to-right: green for "For", red for
 * "Against", with the remainder rendered in the surface-a10 tint.
 */
export const ApprovalQuorumBar = React.memo(function ApprovalQuorumBar({
  label,
  icon,
  percentage,
  threshold,
  forPercent,
  againstPercent,
  className,
}: ApprovalQuorumBarProps) {
  const clampedThreshold = Math.min(Math.max(threshold, 0), 100);

  const leftCount = Math.min(Math.max(Math.round(clampedThreshold / 10), 0), TOTAL_CELLS);

  const forCells = Math.min(Math.max(Math.round(Math.max(forPercent, 0) / 10), 0), TOTAL_CELLS);
  const againstCells = Math.min(
    Math.max(Math.round(Math.max(againstPercent, 0) / 10), 0),
    TOTAL_CELLS - forCells,
  );

  const cells: Array<"for" | "against" | "empty"> = Array.from({ length: TOTAL_CELLS }, (_, i) => {
    if (i < forCells) return "for";
    if (i < forCells + againstCells) return "against";
    return "empty";
  });

  const leftCells = cells.slice(0, leftCount);
  const rightCells = cells.slice(leftCount);

  return (
    <div data-slot="approval-quorum-bar" className={cn("flex flex-col gap-1.5", className)}>
      <div
        className={cn(
          "flex items-center gap-2",
          label || icon ? "justify-between" : "justify-start",
        )}
      >
        {(label || icon) && (
          <div className="flex items-center gap-1 min-w-0">
            {icon}
            {label && (
              <span className="text-sm/5 font-semibold text-primary-t truncate">{label}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-sm/5 font-semibold text-primary-t">{Math.round(percentage)}%</span>
          <span className="text-sm/5 text-secondary-t">/ {Math.round(clampedThreshold)}%</span>
        </div>
      </div>

      <div className="flex h-3 w-full items-stretch overflow-hidden">
        {leftCells.length > 0 && <CellGroup cells={leftCells} widthPercent={clampedThreshold} />}
        {leftCells.length > 0 && rightCells.length > 0 && <div className="w-px self-stretch" />}
        {rightCells.length > 0 && (
          <CellGroup cells={rightCells} widthPercent={100 - clampedThreshold} />
        )}
      </div>
    </div>
  );
});

function CellGroup({
  cells,
  widthPercent,
}: {
  cells: Array<"for" | "against" | "empty">;
  widthPercent: number;
}) {
  return (
    <div className="flex items-stretch" style={{ flexBasis: `${widthPercent}%` }}>
      {cells.map((kind, i) => {
        const isFirst = i === 0;
        const isLast = i === cells.length - 1;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 self-stretch",
              kind === "for" && "bg-green",
              kind === "against" && "bg-red",
              kind === "empty" && "bg-surface-a10",
              isFirst && "rounded-l-[3px]",
              isLast && "rounded-r-[3px]",
            )}
          />
        );
      })}
    </div>
  );
}
