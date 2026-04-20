import { useAccount, useChainId } from "wagmi";
import { Card } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Icon } from "@/components/icon.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { UserStatsNotConnected } from "@/modules/engage/components/user-stats-not-connected.tsx";
import { useGETUserUserUnits, type LibChainId } from "@/generated/olympusUnits";

export const UserStats = () => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId() as LibChainId;

  const { data: unitsData } = useGETUserUserUnits(
    address ?? "",
    { chainId },
    { query: { enabled: !!address } },
  );

  if (!isConnected) {
    return <UserStatsNotConnected />;
  }

  const totalUnits = parseFloat(unitsData?.units.totalUnits ?? "0");

  return (
    <Card className="p-6 h-full">
      <div>
        <p className="text-[20px]/[24px] font-semibold mb-4">Your Stats</p>
        <p className="text-[18px]/[24px] font-semibold mb-2">Drachmas</p>
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[15px]/[20px] text-secondary-t">Total</p>
            <div className="flex items-center gap-x-1">
              <Icon name="drachmaTokenIcon" className="size-4" />
              <NumberFlow
                value={totalUnits}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[15px]/[20px] font-semibold"
              />
            </div>
          </div>
        </div>
        <Separator className="my-4" />
        <p className="text-[18px]/[24px] font-semibold mb-2">iOHM</p>
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[15px]/[20px] text-secondary-t">Available to Claim</p>
            <div className="flex items-center gap-x-1">
              <Icon name="iOHMTokenIcon" className="size-4" />
              <NumberFlow
                value={0}
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
                value={0}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[15px]/[20px] font-semibold"
              />
            </div>
          </div>
        </div>
        <Separator className="my-4" />
        <p className="text-[18px]/[24px] font-semibold mb-2">OHM</p>
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[15px]/[20px] text-secondary-t">Available to Convert</p>
            <div className="flex items-center gap-x-1">
              <Icon name="OHMTokenIcon" className="size-4" />
              <NumberFlow
                value={0}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[15px]/[20px] font-semibold"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[15px]/[20px] text-secondary-t">Converted</p>
            <div className="flex items-center gap-x-1">
              <Icon name="OHMTokenIcon" className="size-4" />
              <NumberFlow
                value={0}
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
