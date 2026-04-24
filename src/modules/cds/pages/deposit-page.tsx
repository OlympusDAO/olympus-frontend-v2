import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositActivePositions } from "../components/deposit-active-positions.tsx";
import { DepositOpenLimitOrders } from "../components/deposit-open-limit-orders.tsx";
import { DepositLimitOrderForm } from "../components/deposit-limit-order-form.tsx";
import { DepositTokenBalances } from "../components/deposit-token-balances.tsx";
import { DepositStatsBar } from "../components/deposit-stats-bar.tsx";
import { DepositMarketForm } from "../components/deposit-market-form.tsx";
import { useDepositPeriods } from "@/lib/hooks/cds/useDepositPeriods";
import { useLimitOrdersEnabled } from "@/lib/hooks/cds/useLimitOrdersEnabled";
import { PriceChart } from "@/components/price-chart";

function getMonthsFromTerm(term: string): number {
  if (term.includes("1 month")) return 1;
  if (term.includes("3 months")) return 3;
  if (term.includes("6 months")) return 6;
  const match = term.match(/(\d+)\s*months?/);
  return match ? parseInt(match[1], 10) : 1;
}

export const CDPage = () => {
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [positionTab, setPositionTab] = useState<"active" | "orders">("active");
  const [selectedTerm, setSelectedTerm] = useState("");

  const { enabledPeriods } = useDepositPeriods();
  const { isEnabled: isLimitOrdersEnabled } = useLimitOrdersEnabled();

  const selectedTermMonths = getMonthsFromTerm(selectedTerm);

  // Set default selected term once periods are loaded
  React.useEffect(() => {
    if (enabledPeriods.length > 0 && !selectedTerm) {
      setSelectedTerm(enabledPeriods[0].displayName);
    }
  }, [enabledPeriods, selectedTerm]);

  return (
    <div className="space-y-8">
      <DepositStatsBar selectedTermMonths={selectedTermMonths} />

      <div>
        <h2 className="text-xl/7 font-semibold mt-8 mb-3">Create Position</h2>
        <Card className="p-6">
          {(() => {
            const orderTypeTabs = isLimitOrdersEnabled ? (
              <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")}>
                <TabsList className="rounded-full w-full [&>*]:flex-1 !p-1 !gap-0.5">
                  <TabsTrigger
                    value="market"
                    className="w-full rounded-full !text-sm/5 !font-semibold"
                  >
                    Market
                  </TabsTrigger>
                  <TabsTrigger
                    value="limit"
                    className="w-full rounded-full !text-sm/5 !font-semibold"
                  >
                    Limit
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null;

            return orderType === "market" ? (
              <DepositMarketForm
                selectedTerm={selectedTerm}
                onSelectedTermChange={setSelectedTerm}
                selectedTermMonths={selectedTermMonths}
                orderTypeTabs={orderTypeTabs}
              />
            ) : (
              <DepositLimitOrderForm
                selectedTerm={selectedTerm}
                onSelectedTermChange={setSelectedTerm}
                orderTypeTabs={orderTypeTabs}
              />
            );
          })()}
        </Card>
      </div>

      <PriceChart depositPeriod={selectedTermMonths} />

      <div>
        <Tabs value={positionTab} onValueChange={(v) => setPositionTab(v as "active" | "orders")}>
          <TabsList className="bg-transparent outline-none h-auto w-fit p-0 gap-1 mb-3 shadow-none">
            <TabsTrigger
              value="active"
              className="rounded-full text-sm/5 font-semibold h-[40px] px-4 py-2.5 bg-transparent shadow-none outline-none text-secondary-t hover:bg-surface-a3 hover:text-primary-t group-data-[active]/tabs-trigger:bg-surface-a5 group-data-[active]/tabs-trigger:outline group-data-[active]/tabs-trigger:outline-[0.5px] group-data-[active]/tabs-trigger:-outline-offset-[0.5px] group-data-[active]/tabs-trigger:outline-a10-b group-data-[active]/tabs-trigger:text-primary-t group-data-[active]/tabs-trigger:shadow-none group-data-[active]/tabs-trigger:hover:bg-surface-a5"
            >
              Active Positions
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="rounded-full text-sm/5 font-semibold h-[40px] px-4 py-2.5 bg-transparent shadow-none outline-none text-secondary-t hover:bg-surface-a3 hover:text-primary-t group-data-[active]/tabs-trigger:bg-surface-a5 group-data-[active]/tabs-trigger:outline group-data-[active]/tabs-trigger:outline-[0.5px] group-data-[active]/tabs-trigger:-outline-offset-[0.5px] group-data-[active]/tabs-trigger:outline-a10-b group-data-[active]/tabs-trigger:text-primary-t group-data-[active]/tabs-trigger:shadow-none group-data-[active]/tabs-trigger:hover:bg-surface-a5"
            >
              Open Orders
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {positionTab === "active" ? <DepositActivePositions /> : <DepositOpenLimitOrders />}
      </div>

      <DepositTokenBalances />
    </div>
  );
};
