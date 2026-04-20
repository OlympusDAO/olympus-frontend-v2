import { Link } from "react-router-dom";
import { calcOhmPremiumPct } from "@/modules/pulse/utils/ohm-metrics";
import { RiArrowRightSLine } from "@remixicon/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipInfo } from "@/components/ui/tooltip";
import { NumberFlow } from "@/components/ui/number-flow";
import { PulseDot } from "@/components/pulse-dot";
import { useCdStatistics } from "@/modules/pulse/hooks/useCdStatistics";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { ProtocolDataSource } from "./protocol-data-source";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";
import iconDark from "@/assets/protocol-4-l.webp";
import iconLight from "@/assets/protocol-4-b.webp";

export function ProtocolConvertibleDeposits() {
  const { data: cd, isLoading: cdLoading } = useCdStatistics();
  const { data: price } = useOhmPrice();
  const { data: treasury } = useTreasuryMetrics();

  if (cdLoading || !cd) {
    return (
      <Card className="p-5 flex flex-col">
        <Skeleton className="mb-1 h-5 w-44" />
        <Separator className="my-4" />
        <Skeleton className="mb-1 h-4 w-32" />
        <Skeleton className="mb-1 h-10 w-40" />
        <Skeleton className="mb-4 h-3 w-52" />
        <Separator className="my-4" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="mb-1 h-3 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div>
            <Skeleton className="mb-1 h-3 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <Separator className="my-4" />
        <Skeleton className="mb-3 h-3 w-36" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="mb-1 h-3 w-16" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div>
            <Skeleton className="mb-1 h-3 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </Card>
    );
  }

  const backing = treasury?.treasuryLiquidBackingPerOhmBacked ?? 0;
  const ohmPrice = price?.price ?? 0;
  const premiumPct = calcOhmPremiumPct(ohmPrice, backing);

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
    <Card className="p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <TooltipInfo title="Convertible Deposits allow users to deposit stablecoins and lock in an OHM conversion price.">
          <p className="text-sm font-semibold text-primary-t">Convertible Deposits</p>
        </TooltipInfo>
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary-t">
            {cd.isMarketActive ? "Active" : "Paused"}
          </span>
          <PulseDot variant={cd.isMarketActive ? "green" : "yellow"} />
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <ColorModeImage
          srcDark={iconDark}
          srcLight={iconLight}
          alt="Convertible Deposits"
          className="min-w-18 h-18"
        />

        <div>
          <p className="text-sm font-semibold mb-1">
            New capital enters through Convertible Deposits
          </p>
          <p className="text-secondary-t text-xs font-normal">
            Users deposit stablecoins to lock in an OHM conversion price. If they convert, the
            treasury grows. If not, deposits are returned — the protocol earns yield either way.
          </p>
        </div>
      </div>
      <Separator className="my-4" />

      {/* Hero: TVL + Deposit button */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-normal text-secondary-t">Total Value Locked</p>
          <NumberFlow
            value={cd.totalDepositsUsd}
            format={{
              style: "currency",
              currency: "USD",
              notation: "compact",
              maximumFractionDigits: 1,
            }}
            className="text-[32px]/[40px] font-semibold [--number-flow-char-height:1.25em]"
          />
          <p className="mt-0.5 text-xs font-normal text-secondary-t tabular-nums">
            {cd.activeBidsCount} recent bids, {premiumPct > 0 ? `+${premiumPct.toFixed(0)}%` : "0%"}{" "}
            premium
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          className="shrink-0 mt-1"
          render={<Link to="/cds/deposit" />}
        >
          Deposit
          <RiArrowRightSLine />
        </Button>
      </div>

      <Separator className="my-4" />

      {/* Key metrics */}
      <div className="grid grid-cols-2">
        <div>
          <p className="text-xs font-normal text-secondary-t">Latest Tick Price</p>
          <NumberFlow
            value={latestTickPrice}
            format={{
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }}
            className="text-sm font-semibold tabular-nums"
          />
        </div>
        <div>
          <p className="text-xs font-normal text-secondary-t">Backing Per OHM</p>
          <NumberFlow
            value={backing}
            format={{
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }}
            className="text-sm font-semibold tabular-nums"
          />
        </div>
      </div>

      <Separator className="my-4" />

      {/* If All CDs Convert */}
      <div>
        <div className="mb-3">
          <TooltipInfo title="Projected impact if all outstanding convertible deposits convert to OHM at their locked conversion prices.">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-t">
              If All CDs Convert
            </p>
          </TooltipInfo>
        </div>
        {/* Labels row */}
        <div className="grid grid-cols-2 mb-0.5">
          <p className="text-xs font-normal text-secondary-t">Supply</p>
          <p className="text-xs font-normal text-secondary-t">Treasury</p>
        </div>
        {/* Values row */}
        <div className="grid grid-cols-2 items-center">
          <p className="text-sm font-semibold tabular-nums flex items-center gap-x-1 flex-wrap">
            <NumberFlow
              prefix="+"
              suffix=" OHM"
              value={Math.round(supplyGrowthOhm)}
              format={{ style: "decimal", notation: "standard" }}
              className="text-sm font-semibold"
            />
            <span className="font-normal">
              (
              <NumberFlow
                value={backingGrowthPercent / 100}
                format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                prefix="+"
                className="text-green font-semibold"
              />
              <span className="text-secondary-t"> backing</span>)
            </span>
          </p>
          <NumberFlow
            value={treasuryGrowthUsd}
            format={{
              style: "currency",
              currency: "USD",
              notation: "compact",
              maximumFractionDigits: 1,
            }}
            prefix="+"
            className="text-sm font-semibold tabular-nums"
          />
        </div>
      </div>

      <ProtocolDataSource sources={["CD Subgraph", "Treasury API"]} />
    </Card>
  );
}
