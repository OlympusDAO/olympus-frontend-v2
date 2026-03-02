import { Interstitial } from "../components/interstitial";
import { RevenueCounter } from "../components/revenue-counter";
import { OhmPriceCard } from "../components/ohm-price-card";
import { BackingCard } from "../components/backing-card";
import { YrfBuybackStats } from "../components/yrf-buyback-stats";
import { EmissionManager } from "../components/emission-manager";
import { RevenueBreakdown } from "../components/revenue-breakdown";
import { ProtocolFlywheel } from "../components/protocol-flywheel";
import { CdStatistics } from "../components/cd-statistics";
import { CoolerMetrics } from "../components/cooler-metrics";
import { ActivityFeed } from "../components/activity-feed";
import { RiLoopLeftFill, RiScales3Fill, RiSafe2Fill, RiHandCoinFill } from "@remixicon/react";

export function LivenessPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero: Revenue Counter + OHM Price + Backing */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <RevenueCounter />
        <OhmPriceCard />
        <BackingCard />
      </div>

      {/* Row 1: Revenue Sources (full width) */}
      <RevenueBreakdown />

      {/* Visual Pipeline: How revenue flows through the protocol */}
      <ProtocolFlywheel />

      {/* Row 2: YRF + Emission Manager (interstitials paired with cards) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Interstitial
            items={[
              {
                icon: <RiLoopLeftFill size={20} />,
                headline: "Treasury yield is converted into OHM demand",
                description:
                  "The Yield Repurchase Facility uses protocol revenue to buy back and burn OHM each week. Backing from burned OHM is reclaimed and recycled, amplifying buying power.",
              },
            ]}
          />
          <YrfBuybackStats />
        </div>
        <div className="space-y-4">
          <Interstitial
            items={[
              {
                icon: <RiScales3Fill size={20} />,
                headline: "Supply only expands when the market demands it",
                description:
                  "The Emission Manager monitors OHM's premium to backing. Above threshold, it enables controlled supply growth via CDs. Below it, YRF buybacks dominate and supply contracts.",
              },
            ]}
          />
          <EmissionManager />
        </div>
      </div>

      {/* Row 3: CD Stats + Cooler (interstitials paired with cards) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Interstitial
            items={[
              {
                icon: <RiSafe2Fill size={20} />,
                headline: "New capital enters through Convertible Deposits",
                description:
                  "Users deposit stablecoins to lock in an OHM conversion price. If they convert, the treasury grows. If not, deposits are returned — the protocol earns yield either way.",
              },
            ]}
          />
          <CdStatistics />
        </div>
        <div className="space-y-4">
          <Interstitial
            items={[
              {
                icon: <RiHandCoinFill size={20} />,
                headline: "Cooler Loans enforce the backing floor",
                description:
                  "Fixed-rate loans at 0.5% APR let holders borrow against gOHM at backing value while generating steady treasury income.",
              },
            ]}
          />
          <CoolerMetrics />
        </div>
      </div>

      {/* Row 4: Activity Feed */}
      <ActivityFeed />
    </div>
  );
}
