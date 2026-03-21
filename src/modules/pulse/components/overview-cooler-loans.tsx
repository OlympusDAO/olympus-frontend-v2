import { Link } from "react-router-dom";
import { RiArrowRightSLine } from "@remixicon/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipInfo } from "@/components/ui/tooltip";
import { NumberFlow } from "@/components/ui/number-flow";
import { useCoolerMetrics } from "@/lib/hooks/liveness/useCoolerMetrics";
import { Separator } from "@/components/ui/separator.tsx";

export function OverviewCoolerLoans() {
  const { data: cooler } = useCoolerMetrics();

  const totalBorrowed = cooler?.totalBorrowed ?? 0;
  const totalCollateral = cooler?.totalCollateralGohm ?? 0;
  const interestRate = cooler?.interestRate ?? 0.5;

  return (
    <Card className="p-5">
      {/* Header */}
      <div className=" flex items-center justify-between">
        <TooltipInfo title="Cooler Loans allow gOHM holders to borrow stablecoins at a fixed APR with no liquidation risk up to LTV.">
          <p className=" text-[15px]/[20px] font-semibold text-primary-t"> Cooler Loans</p>
        </TooltipInfo>
        <NumberFlow
          suffix="APR"
          value={interestRate / 100}
          format={{ style: "percent", notation: "standard" }}
          className="text-xs text-secondary-t"
        />
      </div>
      <Separator className="w-full my-4" />

      {/* Body */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[15px]/[20px] text-secondary-t">Total Borrowed</p>
          <NumberFlow value={totalBorrowed} className="text-[32px]/[40px] font-semibold" />
          <NumberFlow
            suffix="gOHM collateral locked"
            value={totalCollateral}
            format={{ style: "decimal", notation: "standard" }}
            className="text-xs text-secondary-t"
          />
        </div>

        <Button variant="secondary" size="md" render={<Link to="/cooler/borrow" />}>
          Borrow
          <RiArrowRightSLine />
        </Button>
      </div>
    </Card>
  );
}
