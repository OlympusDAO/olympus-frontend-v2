import { Card } from "@/components/ui/card";
import { TooltipInfo } from "@/components/ui/tooltip";
import { formatTickCapacity } from "@/lib/utils/formatters";
import { calculateDailyCapacityReset } from "@/lib/utils/auctionUtils";
import capacityIcon from "@/assets/capacity.png";

interface DailyCapacityCardProps {
  dayState: { convertible: bigint; initTimestamp: bigint | number } | undefined;
  target: bigint | undefined;
}

interface CapacityProgressBarProps {
  consumed: number;
  target: number;
}

const CapacityProgressBar = ({ consumed, target }: CapacityProgressBarProps) => {
  if (target === 0) return null;

  // If consumed <= target, simple green bar
  if (consumed <= target) {
    const percentage = (consumed / target) * 100;
    return (
      <div
        className="absolute top-0 left-0 h-full bg-green rounded-full transition-all duration-500 shadow-[var(--shadow-cds)]"
        style={{ width: `${percentage}%` }}
      />
    );
  }

  // If consumed > target, split bar (green for target, red for overflow)
  const totalWidth = consumed;
  const greenWidth = (target / totalWidth) * 100;

  return (
    <div className="flex w-full h-full rounded-full overflow-hidden">
      <div className="h-full bg-green shadow-[var(--shadow-cds)]" style={{ width: `${greenWidth}%` }} />
      <div className="h-full bg-red flex-1 shadow-[var(--shadow-cds)]" />
    </div>
  );
};

export const DailyCapacityCard = ({ dayState, target }: DailyCapacityCardProps) => {
  const consumed = dayState ? Number(dayState.convertible) : 0;
  const targetNum = target ? Number(target) : 0;
  const percentage =
    dayState && target
      ? ((consumed / targetNum) * 100).toFixed(0)
      : "--";

  const resetInfo = calculateDailyCapacityReset(dayState?.initTimestamp);

  return (
    <Card className="flex flex-row items-center py-2 pl-2 pr-[12px] gap-3 h-[100px]">
      <img src={capacityIcon} alt="Daily Target" className="w-12 h-12" />

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex justify-between items-center w-full">
          <TooltipInfo title="The target amount of OHM available for conversion.">
            Daily Target
          </TooltipInfo>
          <div className="text-sm font-medium">
            {percentage !== "--" ? `${percentage} / 100%` : "--"}
          </div>
        </div>

        <div className="relative w-full h-3 bg-surface-a10 rounded-full overflow-hidden shadow-[0px_0px_0px_0.5px_rgba(20,23,34,0.20)_inset]">
          {dayState && target && (
            <CapacityProgressBar consumed={consumed} target={targetNum} />
          )}
        </div>

        <div className="text-xs text-secondary-t flex justify-between w-full">
          <span>
            <span className="font-medium text-primary-t">{dayState ? formatTickCapacity(dayState.convertible) : "--"}</span>{" "}
            <span className="text-secondary-t">/ {target ? formatTickCapacity(target) : "--"} OHM</span>
          </span>
          {resetInfo && (
            <span className="flex items-center gap-1">
              {resetInfo.text}
              <TooltipInfo title="Time until auction tuning">
                <span className="sr-only">Info</span>
              </TooltipInfo>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
