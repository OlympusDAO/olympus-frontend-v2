import { useState } from "react";
import { Card } from "@/components/ui/card.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useGohmConversionRate } from "@/lib/hooks/useGohmConversion.tsx";
import { RiArrowLeftRightLine } from "@remixicon/react";
import { PriceChange } from "@/components/price-change.tsx";
import { useOhmPriceHistory } from "@/modules/pulse/hooks/useOhmPriceHistory.ts";
import { useGohmPriceHistory } from "@/modules/pulse/hooks/useGohmPriceHistory.ts";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { TokenName } from "@/lib/tokens.ts";
import { getReferenceSnapshot } from "@/lib/utils.ts";

export function WrapInfoCards() {
  const GOHMToken = useToken(TokenName.GOHM);
  const OHMToken = useToken(TokenName.OHM);
  const { conversionRate, isLoading: indexLoading } = useGohmConversionRate();
  const { data: ohmPriceHistory } = useOhmPriceHistory();
  const { data: gohmPriceHistory } = useGohmPriceHistory();

  const ohmRef24h = getReferenceSnapshot(ohmPriceHistory?.dataPoints ?? [], 24);
  const gohmRef24h = getReferenceSnapshot(gohmPriceHistory?.dataPoints ?? [], 24);
  const ohmChange24h =
    ohmRef24h && OHMToken.price > 0
      ? ((OHMToken.price - ohmRef24h.price) / ohmRef24h.price) * 100
      : null;
  const gohmChange24h =
    gohmRef24h && GOHMToken.price > 0
      ? ((GOHMToken.price - gohmRef24h.price) / gohmRef24h.price) * 100
      : null;

  const [inverted, setInverted] = useState(false);

  const rate = Number(conversionRate);
  const fromLabel = inverted ? "gOHM" : "OHM";
  const toLabel = inverted ? "OHM" : "gOHM";
  const toValue = inverted && rate > 0 ? 1 / rate : rate;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="flex flex-col gap-1 p-6">
        <p className="text-[14px]/[20px] font-normal text-secondary-t">OHM Price</p>
        <div className="flex items-center gap-x-2">
          {!OHMToken.price ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <NumberFlow className="text-[20px]/[24px] font-semibold" value={OHMToken.price} />
          )}
          {ohmChange24h !== null && <PriceChange percentage={ohmChange24h} timeframe="24h" />}
        </div>
      </Card>

      <Card className="flex flex-col gap-1 p-6">
        <p className="text-[14px]/[20px] font-normal text-secondary-t">gOHM Price</p>
        <div className="flex items-center gap-x-2">
          {!GOHMToken.price ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <NumberFlow className="text-[20px]/[24px] font-semibold" value={GOHMToken.price} />
          )}
          {gohmChange24h !== null && <PriceChange percentage={gohmChange24h} timeframe="24h" />}
        </div>
      </Card>

      <Card className="flex flex-col gap-1 p-6">
        <p className="text-[14px]/[20px] font-normal text-secondary-t">Conversion Rate</p>
        <div className="flex items-center gap-x-2">
          {indexLoading ? (
            <Skeleton className="h-6 w-40" />
          ) : (
            <div className="flex items-center gap-x-0.5">
              <NumberFlow
                className="text-[20px]/[24px] font-semibold"
                value={1}
                format={{ style: "decimal" }}
                suffix={fromLabel}
              />
              ≈
              <NumberFlow
                className="text-[20px]/[24px] font-semibold"
                value={toValue}
                format={{
                  style: "decimal",
                  notation: "standard",
                  ...(!inverted && { maximumFractionDigits: 6 }),
                }}
                suffix={toLabel}
              />
            </div>
          )}
          <Button
            className="size-6"
            variant="secondary"
            size="sm"
            onClick={() => setInverted((v) => !v)}
          >
            <RiArrowLeftRightLine className="size-3" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
