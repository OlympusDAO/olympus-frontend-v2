import { TreasuryMetricsCards } from "@/modules/pulse/components/treasury-metrics-cards";
import { TreasuryAssetsCard } from "@/modules/pulse/components/treasury-assets-card";
import { TreasuryLiabilitiesCard } from "@/modules/pulse/components/treasury-liabilities-card";
import { TreasuryBackingCard } from "@/modules/pulse/components/treasury-backing-card";
import { TreasuryPolTable } from "@/modules/pulse/components/treasury-pol-table";

export function TreasuryPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <TreasuryMetricsCards />

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xl/6 font-semibold">Assets and Liabilities</p>
      </div>

      <div className="mt-3 flex flex-col gap-4">
        <TreasuryAssetsCard />
        <TreasuryPolTable />
        <TreasuryLiabilitiesCard />
      </div>

      <div className="mt-4">
        <TreasuryBackingCard />
      </div>
    </div>
  );
}
