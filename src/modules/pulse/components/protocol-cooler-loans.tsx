import { Link } from "react-router-dom";
import { RiArrowRightSLine } from "@remixicon/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipInfo } from "@/components/ui/tooltip";
import { NumberFlow } from "@/components/ui/number-flow";
import { useCoolerMetrics } from "@/modules/pulse/hooks/useCoolerMetrics";
import { useWeeklyRevenue } from "@/modules/pulse/hooks/useWeeklyRevenue";
import { ProtocolDataSource } from "./protocol-data-source";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";
import iconDark from "@/assets/protocol-3-l.webp";
import iconLight from "@/assets/protocol-3-b.webp";

export function ProtocolCoolerLoans() {
  const { data: cooler, isLoading } = useCoolerMetrics();
  const revenue = useWeeklyRevenue();

  if (isLoading || !cooler) {
    return (
      <Card className="p-5 flex flex-col">
        <Skeleton className="mb-1 h-4 w-28" />
        <Skeleton className="mb-1 h-10 w-44" />
        <Skeleton className="mb-4 h-3 w-52" />
        <Separator className="my-4" />
        <div className="grid grid-cols-2">
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
        <Skeleton className="mb-3 h-3 w-24" />
        <div className="grid grid-cols-2">
          <div>
            <Skeleton className="mb-1 h-3 w-28" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div>
            <Skeleton className="mb-1 h-3 w-28" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </Card>
    );
  }

  const coolerRevenue = revenue?.sources.find((s) => s.name === "Cooler Interest");
  const weeklyIncome = coolerRevenue?.weeklyAmount ?? 0;
  const annualIncome = weeklyIncome * 52;

  return (
    <Card className="p-5 flex flex-col">
      <TooltipInfo title="Cooler Loans">
        <p className="text-sm font-semibold text-primary-t">Cooler Loans</p>
      </TooltipInfo>
      <div className="flex items-center gap-4 mt-4">
        <ColorModeImage
          srcDark={iconDark}
          srcLight={iconLight}
          alt="Cooler Loans"
          className="min-w-18 h-18"
        />
        <div>
          <p className="text-sm font-semibold mb-1">Cooler Loans enforce the backing floor</p>
          <p className="text-secondary-t text-xs font-normal">
            Fixed-rate loans at 0.5% APR let holders borrow against gOHM at backing value while
            generating steady treasury income.
          </p>
        </div>
      </div>
      <Separator className="my-4" />
      {/* Hero: Total Borrowed + Borrow button */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-normal text-secondary-t">Total Borrowed</p>
          <NumberFlow
            value={cooler.totalBorrowed}
            format={{
              style: "currency",
              currency: "USD",
              notation: "compact",
              maximumFractionDigits: 1,
            }}
            className="text-[32px]/[40px] font-semibold [--number-flow-char-height:1.25em]"
          />
          <div className="flex items-center gap-x-1 mt-0.5">
            <NumberFlow
              value={cooler.totalCollateralGohm}
              format={{ style: "decimal", notation: "standard", maximumFractionDigits: 0 }}
              className="text-xs font-normal text-secondary-t tabular-nums"
            />
            <span className="text-xs font-normal text-secondary-t">gOHM collateral locked</span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="md"
          className="shrink-0 mt-1"
          render={<Link to="/cooler/borrow" />}
        >
          Borrow
          <RiArrowRightSLine />
        </Button>
      </div>

      <Separator className="my-4" />

      {/* Income */}
      <div className="grid grid-cols-2">
        <div>
          <TooltipInfo
            title="Estimated weekly interest income from Cooler Loans."
            className="text-xs font-normal text-secondary-t"
          >
            Weekly Income
          </TooltipInfo>
          <NumberFlow
            value={weeklyIncome}
            format={{
              style: "currency",
              currency: "USD",
              notation: "compact",
              maximumFractionDigits: 1,
            }}
            className="text-sm font-semibold tabular-nums"
          />
        </div>
        <div>
          <TooltipInfo
            title="Annualized interest income from Cooler Loans (weekly × 52)."
            className="text-xs font-normal text-secondary-t"
          >
            Annual Income
          </TooltipInfo>
          <NumberFlow
            value={annualIncome}
            format={{
              style: "currency",
              currency: "USD",
              notation: "compact",
              maximumFractionDigits: 1,
            }}
            className="text-sm font-semibold tabular-nums"
          />
        </div>
      </div>

      <Separator className="my-4" />

      {/* Breakdown */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-primary-t">
          Breakdown
        </p>
        <div className="grid grid-cols-2">
          <div>
            <p className="text-xs font-normal text-secondary-t">MonoCooler (v2)</p>
            <NumberFlow
              value={cooler.monoDebt}
              format={{
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 1,
              }}
              className="text-sm font-semibold tabular-nums"
            />
          </div>
          <div>
            <p className="text-xs font-normal text-secondary-t">Clearinghouse (v1)</p>
            <NumberFlow
              value={cooler.v1Principal}
              format={{
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 1,
              }}
              className="text-sm font-semibold tabular-nums"
            />
          </div>
        </div>
      </div>

      <ProtocolDataSource sources={["Cooler Subgraph"]} />
    </Card>
  );
}
