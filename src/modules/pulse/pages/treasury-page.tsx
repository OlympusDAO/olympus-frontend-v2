import { TreasuryMetricsCards } from "@/modules/pulse/components/treasury-metrics-cards";
import { TreasuryAssetsCard } from "@/modules/pulse/components/treasury-assets-card";
import { TreasuryLiabilitiesCard } from "@/modules/pulse/components/treasury-liabilities-card";
import { TreasuryBackingCard } from "@/modules/pulse/components/treasury-backing-card";
import { TreasuryPolTable } from "@/modules/pulse/components/treasury-pol-table";
import { PulseDot } from "@/components/pulse-dot.tsx";

export function TreasuryPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <TreasuryMetricsCards />
      <div className="flex items-center justify-between mb-3">
        <p className="text-[20px] font-semibold">Assets and Liabilities</p>
        <div className="flex items-center gap-x-1.5">
          <PulseDot variant="green" />
          <p className="text-xs">Last updated 5 mins ago</p>
        </div>
      </div>
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
        <TreasuryAssetsCard />
        <TreasuryLiabilitiesCard />
      </div>
      <TreasuryBackingCard />
      <div className="flex items-center justify-between mb-3">
        <p className="text-[20px] font-semibold">Protocol-Owned Liquidity</p>
        <div className="flex items-center gap-x-1.5">
          <PulseDot variant="green" />
          <p className="text-xs">Last updated 5 mins ago</p>
        </div>
      </div>
      <TreasuryPolTable />
    </div>
  );
}
