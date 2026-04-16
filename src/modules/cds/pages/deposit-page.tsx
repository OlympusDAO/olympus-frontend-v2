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
        <h2 className="text-xl font-semibold mb-3">Create Position</h2>
        <Card className="p-6 space-y-6">
          {/* Order Type Tabs — only visible when limit orders are enabled */}
          {isLimitOrdersEnabled && (
            <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")}>
              <TabsList className="rounded-full w-fit">
                <TabsTrigger value="market" className="rounded-full">
                  Market
                </TabsTrigger>
                <TabsTrigger value="limit" className="rounded-full">
                  Limit
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {orderType === "market" ? (
            <DepositMarketForm
              selectedTerm={selectedTerm}
              onSelectedTermChange={setSelectedTerm}
              selectedTermMonths={selectedTermMonths}
            />
          ) : (
            <DepositLimitOrderForm
              selectedTerm={selectedTerm}
              onSelectedTermChange={setSelectedTerm}
            />
          )}
        </Card>
      </div>

      <PriceChart depositPeriod={selectedTermMonths} />

      <div>
        <Tabs value={positionTab} onValueChange={(v) => setPositionTab(v as "active" | "orders")}>
          <TabsList className="rounded-full w-fit mb-3">
            <TabsTrigger value="active" className="rounded-full">
              Active Positions
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-full">
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
