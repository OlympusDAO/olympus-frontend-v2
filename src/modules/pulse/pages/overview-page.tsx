import { OverviewProtocolRevenue } from "../components/overview-protocol-revenue";
import { OverviewOhmPrice } from "../components/overview-ohm-price";
import { OverviewLiquidBacking } from "../components/overview-liquid-backing";
import { OverviewOhmPremium } from "../components/overview-ohm-premium";
import { OverviewYrf } from "../components/overview-yrf";
import { OverviewCoolerLoans } from "../components/overview-cooler-loans";
import { OverviewConvertibleDeposits } from "../components/overview-convertible-deposits";
import { OverviewLastActions } from "../components/overview-last-actions";

export function OverviewPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Row 1: Protocol Revenue + OHM Price / Liquid Backing / OHM Premium */}
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
        <OverviewProtocolRevenue />
        <div className="grid grid-rows-3 gap-4">
          <OverviewOhmPrice />
          <OverviewLiquidBacking />
          <OverviewOhmPremium />
        </div>
      </div>

      {/* Row 2: YRF (full-width) */}
      <OverviewYrf />

      {/* Row 3: Cooler Loans + Convertible Deposits */}
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
        <OverviewCoolerLoans />
        <OverviewConvertibleDeposits />
      </div>

      {/* Row 4: Last Protocol Actions */}
      <OverviewLastActions />
    </div>
  );
}
