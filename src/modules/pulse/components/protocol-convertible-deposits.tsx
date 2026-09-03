import { Link } from "react-router";
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
import { useCdReopenPrice } from "@/lib/hooks/cds/useCdReopenPrice";
import { mainnet } from "wagmi/chains";
import { useOhmPrice } from "@/lib/hooks/liveness/useOhmPrice";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { ProtocolDataSource } from "./protocol-data-source";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";
import iconDark from "@/assets/protocol-4-l.webp";
import iconLight from "@/assets/protocol-4-b.webp";

export function ProtocolConvertibleDeposits() {
  const { data: cd, isLoading: cdLoading, isError: cdError } = useCdStatistics();
  const { data: price } = useOhmPrice();
  const { data: treasury } = useTreasuryMetrics();
  const { reopenPrice } = useCdReopenPrice(mainnet.id);

  // The exposure read can throw (fetchAllPages refuses to report a truncated total),
  // which fails the whole query. Without this the card sits in its skeleton forever,
  // which reads as "still loading" rather than "we don't know".
  if (cdError || (!cdLoading && !cd)) {
    return (
      <Card className="p-5 flex flex-col">
        <p className="text-sm font-semibold text-primary-t">Convertible Deposits</p>
        <Separator className="my-4" />
        <p className="text-sm text-secondary-t">Data unavailable</p>
        <p className="mt-1 text-xs text-tertiary-t">
          The convertible deposit indexer could not be reached. Figures are hidden rather than shown
          as zero.
        </p>
      </Card>
    );
  }

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

  // Net of principal borrowed back out against pending redemptions: that cash is
  // routinely redeposited as a new position, so the gross figure counts it twice.
  const supplyGrowthOhm = cd.supplyGrowthOhm;
  const treasuryGrowthUsd = cd.totalDepositsUsd;
  const backingGrowthPercent = (() => {
    const b = treasury?.treasuryLiquidBacking ?? 0;
    const supply = treasury?.ohmBackedSupply ?? 0;
    const currentBacking = treasury?.treasuryLiquidBackingPerOhmBacked ?? 0;
    // supplyGrowthOhm is now netConvertibleOhm, which is legitimately 0 when every
    // deposit is encumbered. That is peak backing accretion, so it must not short
    // out the calculation the way a missing denominator would.
    if (supply <= 0 || currentBacking <= 0) return 0;
    if (supplyGrowthOhm <= 0 && treasuryGrowthUsd <= 0) return 0;
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
          <TooltipInfo title="Deposits still held by the facility, net of principal borrowed back out against pending redemptions.">
            <p className="text-sm font-normal text-secondary-t">Total Value Locked</p>
          </TooltipInfo>
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
          <p className="mt-0.5 text-xs font-normal text-secondary-t">
            {cd.activeBidsCount} recent bids, {premiumPct > 0 ? `+${premiumPct.toFixed(0)}%` : "0%"}{" "}
            premium
          </p>
          <p className="mt-0.5 text-xs font-normal text-tertiary-t">
            Net of{" "}
            <NumberFlow
              value={cd.borrowedAmount}
              format={{
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 1,
              }}
              className="text-xs font-normal text-tertiary-t"
            />{" "}
            borrowed against pending redemptions
          </p>
          {!cd.isMarketActive && reopenPrice && (
            <p className="mt-0.5 text-xs font-normal text-secondary-t">
              Market will reopen at{" "}
              <NumberFlow
                value={reopenPrice}
                format={{
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }}
                className="text-xs font-semibold text-primary-t"
              />
            </p>
          )}
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
            className="text-sm font-semibold"
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
            className="text-sm font-semibold"
          />
        </div>
      </div>

      <Separator className="my-4" />

      {/* If All CDs Convert */}
      <div>
        <div className="mb-3">
          <TooltipInfo title="Projected impact if outstanding convertible deposits convert to OHM at their locked conversion prices, net of principal already borrowed back out. Deposits behind an active loan only convert if the borrower repays out of outside capital.">
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
          <p className="text-sm font-semibold flex items-center gap-x-1 flex-wrap">
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
            className="text-sm font-semibold"
          />
        </div>
      </div>

      <ProtocolDataSource sources={["CD Subgraph", "Treasury API"]} />
    </Card>
  );
}
