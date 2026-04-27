import { Card } from "@/components/ui/card.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";
import treasuryMarketDark from "@/assets/treasury-market-value_dark.webp";
import treasuryMarketLight from "@/assets/treasury-market-value_light.webp";
import liquidBackingDark from "@/assets/liquid-backing_dark.webp";
import liquidBackingLight from "@/assets/liquid-backing_light.webp";
import backingPerDark from "@/assets/backing-per-ohm_dark.webp";
import backingPerLight from "@/assets/backing-per-ohm_light.webp";
import supplyDark from "@/assets/ohm_supply_dark.webp";
import supplyLight from "@/assets/ohm_supply_light.webp";

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
          <p className="text-secondary-t text-sm font-normal">Treasury Market Value</p>
          <NumberFlow
            value={data?.treasuryMarketValue ?? 0}
            className="text-2xl font-semibold [--number-flow-char-height:32px]"
          />
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
          <p className="text-secondary-t text-sm font-normal">Liquid Backing</p>
          <NumberFlow
            value={data?.treasuryLiquidBacking ?? 0}
            className="text-2xl font-semibold [--number-flow-char-height:32px]"
          />
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
          <p className="text-secondary-t text-sm font-normal">Backing Per OHM</p>
          <NumberFlow
            value={data?.treasuryLiquidBackingPerOhmBacked ?? 0}
            className="text-2xl font-semibold [--number-flow-char-height:32px]"
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
          <p className="text-secondary-t text-sm font-normal">OHM Supply</p>
          <NumberFlow
            value={data?.ohmTotalSupply ?? 0}
            format={{ style: "decimal" }}
            className="text-2xl font-semibold [--number-flow-char-height:32px]"
          />
        </div>
      </Card>
    </div>
  );
}
