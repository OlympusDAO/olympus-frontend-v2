import { Card } from "@/components/ui/card";
import { useMonoCoolerPosition } from "@/lib/hooks/cooler/useMonoCoolerPosition";
import { useMonoCoolerCapacity } from "@/lib/hooks/cooler/useMonoCoolerCapacity";
import { formatAmount } from "../utils/format";

export function StatsBar() {
  const { position, isLoading } = useMonoCoolerPosition();
  const { globalCapacity, isLoading: capacityLoading } = useMonoCoolerCapacity();

  const stats = [
    {
      label: "Capacity Remaining",
      value: globalCapacity !== undefined ? `${formatAmount(globalCapacity)} USDS` : "--",
      loading: capacityLoading,
    },
    {
      label: "Borrow per gOHM",
      value: position ? `${formatAmount(position.maxOriginationLtv)} USDS` : "--",
    },
    {
      label: "Borrow Rate",
      value: position ? `${(position.interestRateBps / 100).toFixed(2)}%` : "--",
    },
    {
      label: "Amount Borrowed",
      value: position ? `${formatAmount(position.currentDebt)} USDS` : "--",
    },
  ];

  return (
    <div data-slot="stats-bar" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex flex-col gap-1 p-4">
          <p className="text-md text-secondary-t">{stat.label}</p>
          <p className="text-xl font-semibold">
            {(stat.loading ?? isLoading) ? "..." : stat.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
