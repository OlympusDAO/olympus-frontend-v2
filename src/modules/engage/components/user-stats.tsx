import { Card } from "@/components/ui/card.tsx";
import { Icon } from "@/components/icon.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";

export const UserStats = () => {
  return (
    <Card className="p-6 h-full">
      <div>
        <p className="text-[20px]/[24px] font-semibold mb-4">Your Stats</p>
        <p className="text-[18px]/[24px] font-semibold mb-2">Drachmas</p>
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[15px]/[20px] text-secondary-t">This Epoch</p>
            <div className="flex items-center gap-x-1">
              <Icon name="drachmaTokenIcon" className="size-4" />
              <NumberFlow
                value={24_241_245}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[15px]/[20px] font-semibold"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[15px]/[20px] text-secondary-t">Total</p>
            <div className="flex items-center gap-x-1">
              <Icon name="drachmaTokenIcon" className="size-4" />
              <NumberFlow
                value={1_238_022}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[15px]/[20px] font-semibold"
              />
            </div>
          </div>
        </div>
        <div className="my-4 w-full h-px bg-[linear-gradient(90deg,transparent_0%,var(--surface-a10)_10%,var(--surface-a10)_90%,transparent_100%)]" />
        <p className="text-[18px]/[24px] font-semibold mb-2">iOHM</p>
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[15px]/[20px] text-secondary-t">Available to Claim</p>
            <div className="flex items-center gap-x-1">
              <Icon name="iOHMTokenIcon" className="size-4" />
              <NumberFlow
                value={24_241_245}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[15px]/[20px] font-semibold"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[15px]/[20px] text-secondary-t">Claimed</p>
            <div className="flex items-center gap-x-1">
              <Icon name="iOHMTokenIcon" className="size-4" />
              <NumberFlow
                value={1_238_022}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[15px]/[20px] font-semibold"
              />
            </div>
          </div>
        </div>
        <div className="my-4 w-full h-px bg-[linear-gradient(90deg,transparent_0%,var(--surface-a10)_10%,var(--surface-a10)_90%,transparent_100%)]" />
        <p className="text-[18px]/[24px] font-semibold mb-2">OHM</p>
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[15px]/[20px] text-secondary-t">Available to Convert</p>
            <div className="flex items-center gap-x-1">
              <Icon name="OHMColorTokenIcon" className="size-4" />
              <NumberFlow
                value={24_241_245}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[15px]/[20px] font-semibold"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[15px]/[20px] text-secondary-t">Converted</p>
            <div className="flex items-center gap-x-1">
              <Icon name="OHMColorTokenIcon" className="size-4" />
              <NumberFlow
                value={1_238_022}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[15px]/[20px] font-semibold"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
