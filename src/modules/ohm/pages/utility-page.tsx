import { UtilityLiquidityPoolsSection } from "../components/utility-liquidity-pools-table";
import { UtilityLendingMarketsSection } from "../components/utility-lending-markets-table";

export function UtilityPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <UtilityLiquidityPoolsSection />
      <UtilityLendingMarketsSection />
    </div>
  );
}
