import { Card } from "@/components/ui/card.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";
import treasuryMarketDark from "@/assets/treasury-market-value_dark.png";
import treasuryMarketLight from "@/assets/treasury-market-value_light.png";
import liquidBackingDark from "@/assets/liquid-backing_dark.png";
import liquidBackingLight from "@/assets/liquid-backing_light.png";
import backingPerDark from "@/assets/backing-per-ohm_dark.png";
import backingPerLight from "@/assets/backing-per-ohm_light.png";
import supplyDark from "@/assets/ohm_supply_dark.png";
import supplyLight from "@/assets/ohm_supply_light.png";

export function TreasuryMetricsCards() {
  const { data } = useTreasuryMetrics();

  return (
    <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-4">
      <Card className="flex items-center gap-3 p-4">
        <ColorModeImage
          srcDark={treasuryMarketDark}
          srcLight={treasuryMarketLight}
          alt="Treasury Market Value"
          className="w-12"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-secondary-t text-[15px]/[20px] font-medium">Treasury Market Value</p>
          <NumberFlow value={data?.treasuryMarketValue ?? 0} className="text-2xl font-semibold" />
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-4">
        <ColorModeImage
          srcDark={liquidBackingDark}
          srcLight={liquidBackingLight}
          alt="Liquid Backing"
          className="size-12"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-secondary-t text-[15px]/[20px] font-medium">Liquid Backing</p>
          <NumberFlow value={data?.treasuryLiquidBacking ?? 0} className="text-2xl font-semibold" />
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-4">
        <ColorModeImage
          srcDark={backingPerDark}
          srcLight={backingPerLight}
          alt="Liquid Backing"
          className="size-12"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-secondary-t text-[15px]/[20px] font-medium">Backing Per OHM</p>
          <NumberFlow
            value={data?.treasuryLiquidBackingPerOhmBacked ?? 0}
            className="text-2xl font-semibold"
          />
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-4">
        <ColorModeImage
          srcDark={supplyDark}
          srcLight={supplyLight}
          alt="OHM Supply"
          className="size-12"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-secondary-t text-[15px]/[20px] font-medium">OHM Supply</p>
          <NumberFlow
            value={data?.ohmTotalSupply ?? 0}
            format={{ style: "decimal" }}
            className="text-2xl font-semibold"
          />
        </div>
      </Card>
    </div>
  );
}
