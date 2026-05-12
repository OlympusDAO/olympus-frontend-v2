import { Icon } from "@/components/icon";
import { formatTokenAmount } from "@/lib/math";
import { cn } from "@/lib/utils";
import { TooltipInfo } from "@/components/ui/tooltip";

interface PositionInfoProps {
  projectedCollateral: bigint;
  projectedDebt: bigint;
  liquidationThreshold: bigint;
  projectedLiquidationDate: Date | null;
  availableToBorrow: bigint;
  currentDebt: bigint;
}

function formatGohm(value: bigint): string {
  return formatTokenAmount(value).toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatUsds(value: bigint): string {
  return formatTokenAmount(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function calculateLtv(debt: bigint, liquidationThreshold: bigint): string {
  if (liquidationThreshold === 0n) return "0.00";
  const ltv = (formatTokenAmount(debt) / formatTokenAmount(liquidationThreshold)) * 100;
  return ltv.toFixed(2);
}

function formatLiquidationDate(date: Date | null): string {
  if (!date) return "—";
  if (date.getTime() <= Date.now()) return "Now";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BorrowPositionInfo({
  projectedCollateral,
  projectedDebt,
  liquidationThreshold,
  projectedLiquidationDate,
  availableToBorrow,
  currentDebt,
}: PositionInfoProps) {
  const hasPosition = projectedCollateral > 0n || projectedDebt > 0n || currentDebt > 0n;
  const bufferToLiquidation =
    liquidationThreshold > projectedDebt ? liquidationThreshold - projectedDebt : 0n;

  return (
    <div
      data-slot="position-info"
      className="rounded-2xl bg-surface-a3 border border-a3-b px-4 py-4 flex flex-col h-full"
    >
      <h3 className="mb-4 text-sm font-semibold">Projected Position</h3>

      {!hasPosition ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <p className="text-sm/5 font-semibold text-secondary-t">No position</p>
          <p className="text-xs/4 font-normal text-secondary-t mt-1">
            Add collateral and borrow to open a position.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <InfoRow label="Collateral">
            <div className="flex items-center gap-1.5">
              <Icon name="GOHMTokenIcon" className="size-4" />
              <span className="font-medium">{formatGohm(projectedCollateral)} gOHM</span>
            </div>
          </InfoRow>

          <InfoRow label="Debt">
            <div className="flex items-center gap-1.5">
              <Icon name="USDSColorTokenIcon" className="size-4" />
              <span className="font-medium">{formatUsds(projectedDebt)} USDS</span>
            </div>
          </InfoRow>

          <InfoRow label="LTV">
            <span
              className={cn(
                "font-medium",
                Number(calculateLtv(projectedDebt, liquidationThreshold)) > 80
                  ? "text-red"
                  : "text-primary-t",
              )}
            >
              {calculateLtv(projectedDebt, liquidationThreshold)}%
            </span>
          </InfoRow>

          <InfoRow
            label="Buffer to Liquidation"
            tooltip="How much your debt can grow — through accruing interest or new borrows — before the position is liquidated."
          >
            <span className="font-medium">{formatUsds(bufferToLiquidation)} USDS</span>
          </InfoRow>

          <InfoRow
            label="Est. Liquidation Date"
            tooltip='When accruing interest is projected to push your debt to the liquidation threshold, assuming no further actions. "Now" means the position is already past the threshold; "—" means there is no debt or no rate to project from.'
          >
            <span className="font-medium">{formatLiquidationDate(projectedLiquidationDate)}</span>
          </InfoRow>

          <InfoRow label="Available to Borrow">
            <span className="font-medium">{formatUsds(availableToBorrow)} USDS</span>
          </InfoRow>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-a3-b py-2 last:border-b-0">
      {tooltip ? (
        <TooltipInfo title={tooltip} className="text-xs font-normal">
          {label}
        </TooltipInfo>
      ) : (
        <span className="text-xs text-secondary-t">{label}</span>
      )}
      <div className="text-sm">{children}</div>
    </div>
  );
}
