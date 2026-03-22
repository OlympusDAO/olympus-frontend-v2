import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberFlow } from "@/components/ui/number-flow";
import { useRevenueCounter } from "@/modules/pulse/hooks/useRevenueCounter";
import marbleBgLight from "@/assets/bgTreasuryDesktopLight.png";
import marbleBgDark from "@/assets/bgTreasuryDesktopDark.png";
import { useTheme } from "@/components/theme-provider.tsx";

export function ProtocolTreasuryRevenue() {
  const { displayValue, weeklyTotal, isLoading } = useRevenueCounter();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-between">
        <div>
          <Skeleton className="mb-1 h-5 w-36" />
          <Skeleton className="mb-1 h-10 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="flex items-center gap-x-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-a5-b bg-surface-a3 px-4 py-3 rounded-[12px]">
              <Skeleton className="mb-1 h-5 w-20" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const perSecond = weeklyTotal / (7 * 24 * 60 * 60);
  const perHour = weeklyTotal / (7 * 24);

  return (
    <Card
      className="p-8 flex items-center justify-between bg-surface-bg-l2"
      style={{
        backgroundImage: `url(${theme === "light" ? marbleBgLight : marbleBgDark})`,
        backgroundSize: "cover",
        backgroundPosition: "left",
      }}
    >
      <div>
        <p className="mb-1 text-[15px]/[20px] font-semibold">Treasury Revenue</p>
        <NumberFlow value={displayValue} className="text-[32px]/[40px] font-semibold" />
        <p className="text-xs text-secondary-t mt-0.5">
          Estimated yield since Mar 2, 1:00 AM GMT+1
        </p>
      </div>
      <div className="flex items-center gap-x-3">
        <div className="border border-a5-b bg-surface-a3 px-4 py-3 rounded-[12px]">
          <p className="text-[15px]/[20px] text-secondary-t mb-1">Per Second</p>
          <NumberFlow value={perSecond} className="text-[24px]/[32px] font-semibold" />
        </div>
        <div className="border border-a5-b bg-surface-a3 px-4 py-3 rounded-[12px]">
          <p className="text-[15px]/[20px] text-secondary-t mb-1">Per Hour</p>
          <NumberFlow value={perHour} className="text-[24px]/[32px] font-semibold" />
        </div>
        <div className="border border-a5-b bg-surface-a3 px-4 py-3 rounded-[12px]">
          <p className="text-[15px]/[20px] text-secondary-t mb-1">Per Day</p>
          <NumberFlow value={weeklyTotal / 7} className="text-[24px]/[32px] font-semibold" />
        </div>
        <div className="border border-a5-b bg-surface-a3 px-4 py-3 rounded-[12px]">
          <p className="text-[15px]/[20px] text-secondary-t mb-1">Per Week</p>
          <NumberFlow value={weeklyTotal} className="text-[24px]/[32px] font-semibold" />
        </div>
      </div>
    </Card>
  );
}
