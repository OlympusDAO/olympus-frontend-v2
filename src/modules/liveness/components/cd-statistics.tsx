import { Card } from "@/components/ui/card";
import { DataSource } from "./data-source";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipInfo } from "@/components/ui/tooltip";
import { useCdStatistics } from "@/lib/hooks/liveness/useCdStatistics";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics.ts";
import { formatUsd, formatNumber } from "@/lib/liveness/formatters";
import { RiExternalLinkLine } from "@remixicon/react";

export function CdStatistics() {
  const { data: cd, isLoading: cdLoading } = useCdStatistics();
  const { data: price } = useOhmPrice();
  const { data: treasury } = useTreasuryMetrics();

  if (cdLoading || !cd) {
    return (
      <Card className="p-6">
        <Skeleton className="mb-4 h-4 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
    );
  }

  const backing = treasury?.treasuryLiquidBackingPerOhmBacked ?? 0;
  const ohmPrice = price?.price ?? 0;
  const premiumPct = backing > 0 ? ((ohmPrice - backing) / backing) * 100 : 0;

  const latestBid = cd.bids[0];
  const latestTickPrice = latestBid ? parseFloat(latestBid.tickPriceDecimal) : 0;

  const supplyGrowthOhm = cd.supplyGrowthOhm;
  const treasuryGrowthUsd = cd.totalDepositsUsd;
  const backingGrowthPercent = (() => {
    const b = treasury?.treasuryLiquidBacking ?? 0;
    const supply = treasury?.ohmBackedSupply ?? 0;
    const currentBacking = treasury?.treasuryLiquidBackingPerOhmBacked ?? 0;
    if (supply <= 0 || currentBacking <= 0 || supplyGrowthOhm <= 0) return 0;
    const newBacking = (b + treasuryGrowthUsd) / (supply + supplyGrowthOhm);
    return ((newBacking - currentBacking) / currentBacking) * 100;
  })();

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <a
          href="/#/cds/deposit"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-1.5 transition-colors hover:text-green"
        >
          <TooltipInfo
            title="Convertible Deposits allow users to deposit stablecoins and lock in an OHM conversion price."
            className="text-xs font-medium uppercase tracking-widest"
          >
            Convertible Deposits
          </TooltipInfo>
          <RiExternalLinkLine
            size={13}
            className="text-tertiary-t/60 transition-colors group-hover:text-green"
          />
        </a>
        <div className="flex items-center gap-2">
          <div
            className={
              cd.isMarketActive ? "size-2 rounded-full bg-green" : "size-2 rounded-full bg-yellow"
            }
          />
          <span className="text-xs text-secondary-t">
            {cd.isMarketActive ? "Active" : "Paused"}
          </span>
        </div>
      </div>

      {/* Hero: TVL with context */}
      <div className="mb-5">
        <p className="text-xs text-tertiary-t">Total Value Locked</p>
        <p className="tabular-nums text-3xl font-bold tracking-tight">
          {formatUsd(cd.totalDepositsUsd, true)}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-tertiary-t">
          {cd.activeBidsCount} recent bids · {premiumPct > 0 ? `+${premiumPct.toFixed(0)}%` : "0%"}{" "}
          premium
        </p>
      </div>

      {/* Key metrics */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-tertiary-t">Latest Tick Price</p>
          <p className="tabular-nums text-lg font-semibold">
            {latestTickPrice > 0 ? formatUsd(latestTickPrice) : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-tertiary-t">Backing Per OHM</p>
          <p className="tabular-nums text-lg font-semibold">{formatUsd(backing)}</p>
        </div>
      </div>

      {/* Conversion impact — compact panel */}
      <div className="rounded-2xl border border-a10-b bg-surface-a3 px-5 py-4">
        <div className="mb-2">
          <TooltipInfo
            title="Projected impact if all outstanding convertible deposits convert to OHM at their locked conversion prices."
            className="text-xs font-medium uppercase tracking-widest text-secondary-t"
          >
            If All CDs Convert
          </TooltipInfo>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-tertiary-t">Supply</p>
            <p className="tabular-nums text-sm font-semibold">
              +{formatNumber(Math.round(supplyGrowthOhm))}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-tertiary-t">Treasury</p>
            <p className="tabular-nums text-sm font-semibold">
              +{formatUsd(treasuryGrowthUsd, true)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-tertiary-t">Backing</p>
            <p className="tabular-nums text-sm font-semibold text-green">
              {backingGrowthPercent >= 0 ? "+" : ""}
              {backingGrowthPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
      <DataSource sources={["CD Subgraph", "Treasury API"]} />
    </Card>
  );
}
