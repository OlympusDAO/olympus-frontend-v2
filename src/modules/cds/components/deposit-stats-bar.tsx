import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { TooltipInfo } from "@/components/ui/tooltip";
import { NumberFlow } from "@/components/ui/number-flow";
import { Progress } from "@/components/ui/progress";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";
import { CircularProgress } from "@/components/ui/circular-progress";
import { calculateNextTick, calculateDailyCapacityReset } from "@/lib/utils/auctionUtils";
import { formatTickCapacity } from "@/lib/utils/formatters";
import { useCurrentTick } from "@/lib/hooks/cds/useCurrentTick";
import { useAuctionParameters } from "@/lib/hooks/cds/useAuctionParameters";
import { useDayState } from "@/lib/hooks/cds/useDayState";
import { useCurrentTickSize } from "@/lib/hooks/cds/useCurrentTickSize";
import cdDeposit1b from "@/assets/cd-deposit-1b.png";
import cdDeposit1l from "@/assets/cd-deposit-1l.png";
import cdDeposit2b from "@/assets/cd-deposit-2b.png";
import cdDeposit2l from "@/assets/cd-deposit-2l.png";
import cdDeposit3b from "@/assets/cd-deposit-3b.png";
import cdDeposit3l from "@/assets/cd-deposit-3l.png";
import trendingDownIcon from "@/assets/trending-down.svg";

interface DepositStatsBarProps {
  selectedTermMonths: number;
}

export function DepositStatsBar({ selectedTermMonths }: DepositStatsBarProps) {
  const { tickData, isLoading: isLoadingTick } = useCurrentTick({
    depositPeriod: selectedTermMonths,
    enabled: selectedTermMonths > 0,
  });
  const { auctionParameters, depositPeriodsCount, tickStep } = useAuctionParameters();
  const { dayState } = useDayState();
  const { currentTickSize } = useCurrentTickSize();

  // Capacity animation state
  const [prevCapacity, setPrevCapacity] = useState<bigint | null>(null);
  const [capacityChanged, setCapacityChanged] = useState(false);
  const [capacityIncreased, setCapacityIncreased] = useState(true);

  useEffect(() => {
    if (tickData?.capacity && prevCapacity !== null && tickData.capacity !== prevCapacity) {
      setCapacityChanged(true);
      setCapacityIncreased(tickData.capacity > prevCapacity);
      const timer = setTimeout(() => setCapacityChanged(false), 500);
      return () => clearTimeout(timer);
    }
    if (tickData?.capacity) {
      setPrevCapacity(tickData.capacity);
    }
  }, [tickData?.capacity, prevCapacity]);

  // Card 1 & 2: tick-based values
  const conversionPrice = tickData ? Number(tickData.price) / 1e18 : null;
  const capacity = tickData ? Number(tickData.capacity) / 1e9 : null;

  const tickSizeNum = (() => {
    const ts = currentTickSize ?? auctionParameters?.tickSize;
    return ts ? Number(ts) / 1e9 : null;
  })();

  const capacityPercent = (() => {
    const ts = currentTickSize ?? auctionParameters?.tickSize;
    if (!tickData?.capacity || !ts) return 0;
    return Math.min(100, (Number(tickData.capacity) / Number(ts)) * 100);
  })();

  const nextTickInfo = calculateNextTick(
    tickData,
    auctionParameters,
    depositPeriodsCount,
    tickStep,
    currentTickSize,
  );

  // Card 3: daily target values
  const consumed = dayState ? Number(dayState.convertible) : 0;
  const targetNum = auctionParameters?.target ? Number(auctionParameters.target) : 0;
  const dailyPercentage =
    dayState && targetNum > 0 ? ((consumed / targetNum) * 100).toFixed(0) : "--";
  const dailyProgressValue = targetNum > 0 ? Math.min((consumed / targetNum) * 100, 100) : 0;
  const dailyOverflowPercent =
    consumed > targetNum && targetNum > 0 ? ((consumed - targetNum) / consumed) * 100 : undefined;
  const resetInfo = calculateDailyCapacityReset(dayState?.initTimestamp);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Conversion Price Card */}
      <Card className="flex flex-row items-center gap-3 p-5">
        <ColorModeImage
          srcLight={cdDeposit1l}
          srcDark={cdDeposit1b}
          alt="Conversion Price"
          className="size-12 rounded-full shadow-card dark:shadow-none"
        />
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm text-secondary-t">
            <TooltipInfo title="The fixed price at which your deposit can be converted into OHM before maturity. If OHM's market price is above this level, your Conversion Right is valuable and you can acquire OHM at a discount. If not, you can redeem your stablecoins 1:1 instead.">
              Conversion Price
            </TooltipInfo>
          </p>
          <div className="flex flex-col gap-0.5">
            <NumberFlow
              className="text-xl/[24px] font-semibold tracking-[0.2px]"
              value={isLoadingTick ? "-" : conversionPrice}
              format={{ style: "decimal", minimumFractionDigits: 4, maximumFractionDigits: 4 }}
              suffix="USDS/OHM"
            />
            <div className="text-xs text-secondary-t flex items-center gap-1">
              {!nextTickInfo ? (
                <span>--</span>
              ) : nextTickInfo.timeUntilTick === "Min Price Reached" ? (
                <span>{nextTickInfo.timeUntilTick}</span>
              ) : (
                <>
                  <img src={trendingDownIcon} alt="trending down" className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{nextTickInfo.nextPrice}</span>
                  <span>in {nextTickInfo.timeUntilTick}</span>
                  <TooltipInfo title="Time until the next price decay tick.">
                    <span className="sr-only">Info</span>
                  </TooltipInfo>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Available at Current Price Card */}
      <Card className="flex flex-row items-center gap-3 p-5">
        <ColorModeImage
          srcLight={cdDeposit2l}
          srcDark={cdDeposit2b}
          alt="Available at Current Price"
          className="size-12 rounded-full shadow-card dark:shadow-none"
        />
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm text-secondary-t">
            <TooltipInfo title="The amount of OHM available at the current price.">
              Available at Current Price
            </TooltipInfo>
          </p>
          <div className="flex flex-col gap-0.5">
            <NumberFlow
              className={`text-xl/[24px] font-semibold tracking-[0.2px] transition-all duration-300 origin-left ${
                capacityChanged
                  ? capacityIncreased
                    ? "text-green scale-110"
                    : "text-red scale-110"
                  : ""
              }`}
              value={isLoadingTick ? "-" : capacity}
              format={{ style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              suffix="OHM"
            />
            <div className="text-xs text-secondary-t flex items-center gap-1.5">
              <CircularProgress
                value={capacityPercent}
                size={16}
                strokeWidth={3}
                trackColor="text-surface-a3"
                indicatorColor="text-green"
              />
              <span>
                out of{" "}
                <NumberFlow
                  className="inline"
                  value={tickSizeNum}
                  format={{ style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                />{" "}
                OHM / tick
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Daily Target Card */}
      <Card className="flex flex-row items-center gap-3 p-5 sm:col-span-2 lg:col-span-1">
        <ColorModeImage
          srcLight={cdDeposit3l}
          srcDark={cdDeposit3b}
          alt="Daily Target"
          className="size-12 rounded-full shadow-card dark:shadow-none"
        />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-secondary-t">
              <TooltipInfo title="The target amount of OHM available for conversion.">
                Daily Target
              </TooltipInfo>
            </p>
            <span className="text-xs text-secondary-t shrink-0">
              {dailyPercentage !== "--" ? `${dailyPercentage} / 100%` : "--"}
            </span>
          </div>
          <Progress
            value={dailyOverflowPercent !== undefined ? 100 : dailyProgressValue}
            overflowPercent={dailyOverflowPercent}
          />
          <div className="text-xs text-secondary-t flex justify-between gap-2">
            <span>
              <span className="font-semibold text-primary-t">
                {dayState ? formatTickCapacity(dayState.convertible) : "--"}
              </span>{" "}
              / {auctionParameters?.target ? formatTickCapacity(auctionParameters.target) : "--"}{" "}
              OHM
            </span>
            {resetInfo && (
              <span className="flex items-center gap-1 shrink-0">
                {resetInfo.text}
                <TooltipInfo title="Time until auction tuning">
                  <span className="sr-only">Info</span>
                </TooltipInfo>
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
