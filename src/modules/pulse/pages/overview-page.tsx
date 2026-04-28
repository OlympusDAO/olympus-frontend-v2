import { useState } from "react";
import { OverviewProtocolRevenue } from "../components/overview-protocol-revenue";
import { OverviewOhmPrice } from "../components/overview-ohm-price";
import { OverviewLiquidBacking } from "../components/overview-liquid-backing";
import { OverviewOhmPremium } from "../components/overview-ohm-premium";
import { OverviewYrf } from "../components/overview-yrf";
import { OverviewCoolerLoans } from "../components/overview-cooler-loans";
import { OverviewConvertibleDeposits } from "../components/overview-convertible-deposits";
import { OverviewLastActions } from "../components/overview-last-actions";
import type { TimeWindow } from "../hooks/useRevenueCounter";

export function OverviewPage() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("weekly");

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Row 1: Protocol Revenue + OHM Price / Liquid Backing / OHM Premium */}
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
        <OverviewProtocolRevenue timeWindow={timeWindow} setTimeWindow={setTimeWindow} />
        <div className="grid grid-rows-3 gap-4">
          <OverviewOhmPrice timeWindow={timeWindow} />
          <OverviewLiquidBacking timeWindow={timeWindow} />
          <OverviewOhmPremium timeWindow={timeWindow} />
        </div>
      </div>

      {/* Row 2: Cooler Loans + Convertible Deposits + YRF */}
      <div className="grid grid-cols-3 max-md:grid-cols-1 gap-4">
        <OverviewCoolerLoans />
        <OverviewConvertibleDeposits />
        <OverviewYrf />
      </div>

      {/* Row 4: Last Protocol Actions */}
      <OverviewLastActions />
    </div>
  );
}
