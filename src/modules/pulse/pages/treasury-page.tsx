import { TreasuryMetricsCards } from "@/modules/pulse/components/treasury-metrics-cards";
import { TreasuryAssetsCard } from "@/modules/pulse/components/treasury-assets-card";
import { TreasuryLiabilitiesCard } from "@/modules/pulse/components/treasury-liabilities-card";
import { TreasuryBackingCard } from "@/modules/pulse/components/treasury-backing-card";
import { TreasuryPolTable } from "@/modules/pulse/components/treasury-pol-table";
import { PulseDot } from "@/components/pulse-dot.tsx";

export function TreasuryPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <TreasuryMetricsCards />

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xl/6 font-semibold">Assets and Liabilities</p>
        <div className="flex items-center gap-x-1.5">
          <PulseDot variant="green" />
          <p className="text-secondary-t text-xs/4 font-normal">Last updated 5 mins ago</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 max-md:grid-cols-1 gap-4">
        <TreasuryAssetsCard />
        <TreasuryLiabilitiesCard />
      </div>

      <div className="mt-4">
        <TreasuryBackingCard />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xl/6 font-semibold">Protocol-Owned Liquidity</p>
        <div className="flex items-center gap-x-1.5">
          <PulseDot variant="green" />
          <p className="text-secondary-t text-xs/4 font-normal">Last updated 5 mins ago</p>
        </div>
      </div>

      <div className="mt-3">
        <TreasuryPolTable />
      </div>
    </div>
  );
}
