import { Card } from "@/components/ui/card";
import { DataSource } from "./data-source";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useCoolerMetrics } from "@/lib/hooks/liveness/useCoolerMetrics";
import { useWeeklyRevenue } from "@/lib/hooks/liveness/useWeeklyRevenue";
import { formatUsd, formatNumber } from "@/lib/liveness/formatters";
import { RiExternalLinkLine } from "@remixicon/react";
import { COOLER_APP_URL } from "@/lib/constants";

export function CoolerMetrics() {
  const { data: cooler, isLoading } = useCoolerMetrics();
  const revenue = useWeeklyRevenue();

  if (isLoading || !cooler) {
    return (
      <Card className="p-6">
        <Skeleton className="mb-4 h-4 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
    );
  }

  const coolerRevenue = revenue?.sources.find(
    (s) => s.name === "Cooler Interest",
  );
  const weeklyIncome = coolerRevenue?.weeklyAmount ?? 0;
  const annualIncome = weeklyIncome * 52;

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <a
          href={COOLER_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-1.5 transition-colors hover:text-green"
        >
          <TooltipInfo
            title="Cooler Loans allow gOHM holders to borrow stablecoins at 0.5% APR with no liquidation risk (up to LTV)."
            className="text-xs font-medium uppercase tracking-widest"
          >
            Cooler Loans
          </TooltipInfo>
          <RiExternalLinkLine size={13} className="text-tertiary-t/60 transition-colors group-hover:text-green" />
        </a>
        <span className="rounded-md border border-a10-b bg-surface-a3 px-2 py-0.5 text-[10px] font-medium tabular-nums text-secondary-t">
          {cooler.interestRate.toFixed(1)}% APR
        </span>
      </div>

      {/* Hero: Total Borrowed */}
      <div className="mb-5">
        <p className="text-xs text-tertiary-t">Total Borrowed</p>
        <p className="tabular-nums text-3xl font-bold tracking-tight">
          {formatUsd(cooler.totalBorrowed, true)}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-tertiary-t">
          {formatNumber(cooler.totalCollateralGohm)} gOHM collateral locked
        </p>
      </div>

      {/* Income metrics */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-tertiary-t">Weekly Income</p>
          <p className="tabular-nums text-lg font-semibold">
            {weeklyIncome > 0 ? formatUsd(weeklyIncome, true) : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-tertiary-t">Annual Income</p>
          <p className="tabular-nums text-lg font-semibold">
            {annualIncome > 0 ? formatUsd(annualIncome, true) : "-"}
          </p>
        </div>
      </div>

      {/* Protocol breakdown */}
      {cooler.totalBorrowed > 0 && (
        <div className="rounded-2xl border border-a10-b bg-surface-a3 px-5 py-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-secondary-t">
            Breakdown
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-tertiary-t">MonoCooler (v2)</span>
              <span className="tabular-nums font-medium">
                {formatUsd(cooler.monoDebt, true)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-tertiary-t">Clearinghouse (v1)</span>
              <span className="tabular-nums font-medium">
                {formatUsd(cooler.v1Principal, true)}
              </span>
            </div>
          </div>
        </div>
      )}
      <DataSource sources={["Cooler Subgraph"]} />
    </Card>
  );
}
