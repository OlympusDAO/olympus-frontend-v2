import { Link } from "react-router-dom";
import { RiArrowRightSLine } from "@remixicon/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipInfo } from "@/components/ui/tooltip";
import { NumberFlow } from "@/components/ui/number-flow";
import { useCoolerMetrics } from "@/modules/pulse/hooks/useCoolerMetrics";
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
          <p className="text-sm/5 font-semibold text-primary-t">Cooler Loans</p>
        </TooltipInfo>
        <NumberFlow
          suffix="APR"
          value={interestRate / 100}
          format={{ style: "percent", notation: "standard" }}
          className="text-xs/4 text-secondary-t font-normal"
        />
      </div>
      <Separator className="w-full my-4" />

      {/* Body */}
      <div>
        <p className="text-sm/5 text-secondary-t font-normal">Total Borrowed</p>
        <NumberFlow
          value={totalBorrowed}
          className="mt-1 block text-[32px]/[40px] font-semibold [--number-flow-char-height:1.25em]"
        />
        <NumberFlow
          suffix="gOHM collateral locked"
          value={totalCollateral}
          format={{ style: "decimal", notation: "standard" }}
          className="mt-0.5 block text-xs/4 text-secondary-t font-normal [--number-flow-char-height:1.3333em]"
        />
      </div>

      <div className="mt-4">
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          render={<Link to="/cooler/borrow" />}
        >
          Borrow
          <RiArrowRightSLine />
        </Button>
      </div>
    </Card>
  );
}
