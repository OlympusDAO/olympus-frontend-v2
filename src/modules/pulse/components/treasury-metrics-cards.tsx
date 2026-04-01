import { Card } from "@/components/ui/card.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { useTreasuryMetrics } from "@/modules/pulse/hooks/useTreasuryMetrics";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";
import treasuryMarketDark from "@/assets/treasuryMarketDark.png";
import liquidBackingDark from "@/assets/liquidBackingDark.png";
import backingPerDark from "@/assets/backingPerDark.png";
import supplyDark from "@/assets/supplyDark.png";

export function TreasuryMetricsCards() {
  const { data } = useTreasuryMetrics();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card className="flex items-center gap-3 p-4">
        <ColorModeImage
          srcDark={treasuryMarketDark}
          srcLight={treasuryMarketDark}
          alt="Treasury Market Value"
          className="w-12"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-secondary-t text-[15px]/[20px]">Treasury Market Value</p>
          <NumberFlow value={data?.treasuryMarketValue ?? 0} className="text-2xl font-semibold" />
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-4">
        <ColorModeImage
          srcDark={liquidBackingDark}
          srcLight={liquidBackingDark}
          alt="Liquid Backing"
          className="size-12"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-secondary-t text-[15px]/[20px]">Liquid Backing</p>
          <NumberFlow value={data?.treasuryLiquidBacking ?? 0} className="text-2xl font-semibold" />
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-4">
        <ColorModeImage
          srcDark={backingPerDark}
          srcLight={backingPerDark}
          alt="Liquid Backing"
          className="size-12"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-secondary-t text-[15px]/[20px]">Backing Per OHM</p>
          <NumberFlow
            value={data?.treasuryLiquidBackingPerOhmBacked ?? 0}
            className="text-2xl font-semibold"
          />
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-4">
        <ColorModeImage
          srcDark={supplyDark}
          srcLight={supplyDark}
          alt="OHM Supply"
          className="size-12"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-secondary-t text-[15px]/[20px]">OHM Supply</p>
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
