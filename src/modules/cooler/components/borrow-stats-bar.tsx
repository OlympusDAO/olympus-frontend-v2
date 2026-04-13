import { NumberFlow } from "@/components/ui/number-flow";
import { Card } from "@/components/ui/card";
import { useMonoCoolerPosition } from "@/lib/hooks/cooler/useMonoCoolerPosition";
import { useMonoCoolerCapacity } from "@/lib/hooks/cooler/useMonoCoolerCapacity";
import { formatUnits } from "viem";
import type { Format } from "@number-flow/react";

type Stat = {
  label: string;
  value: number | null;
  format: Format;
  suffix?: string;
  loading?: boolean;
};

function bigintToNumber(value: bigint): number {
  return Number(formatUnits(value, 18));
}

export function BorrowStatsBar() {
  const { position, isLoading } = useMonoCoolerPosition();
  const { globalCapacity, isLoading: capacityLoading } = useMonoCoolerCapacity();

  const stats: Stat[] = [
    {
      label: "Capacity Remaining",
      value: globalCapacity !== undefined ? bigintToNumber(globalCapacity) : null,
      format: { style: "decimal", maximumFractionDigits: 0 },
      suffix: "USDS",
      loading: capacityLoading,
    },
    {
      label: "Borrow per gOHM",
      value: position ? bigintToNumber(position.maxOriginationLtv) : null,
      format: { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 },
      suffix: "USDS",
    },
    {
      label: "Borrow Rate",
      value: position ? position.interestRateBps / 100 : null,
      format: { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 },
      suffix: "%",
    },
    {
      label: "Amount Borrowed",
      value: position ? bigintToNumber(position.currentDebt) : null,
      format: { style: "decimal", maximumFractionDigits: 0 },
      suffix: "USDS",
    },
  ];

  return (
    <div data-slot="stats-bar" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex flex-col gap-1 px-6 py-5">
          <p className="text-base font-normal text-secondary-t">{stat.label}</p>
          <NumberFlow
            className="text-xl/[24px] font-semibold tracking-[0.2px]"
            value={(stat.loading ?? isLoading) || stat.value === null ? "-" : stat.value}
            format={stat.format}
            suffix={stat.suffix}
            suffixNoSpace={stat.suffix === "%"}
          />
        </Card>
      ))}
    </div>
  );
}
