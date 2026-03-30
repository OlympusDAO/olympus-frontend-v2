import { Card } from "@/components/ui/card";
import { useMonoCoolerPosition } from "@/lib/hooks/cooler/useMonoCoolerPosition";
import { formatAmount } from "../utils/format";

export function StatsBar() {
  const { position, isLoading } = useMonoCoolerPosition();

  const stats = [
    {
      label: "Capacity Remaining",
      value: position ? `${formatAmount(position.maxOriginationDebtAmount)} USDS` : "--",
    },
    {
      label: "Borrow per gOHM",
      value: position
        ? `${formatAmount(position.maxOriginationLtv)} USDS`
        : "--",
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
            {isLoading ? "..." : stat.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
