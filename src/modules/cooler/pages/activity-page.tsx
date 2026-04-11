import type { ReactNode } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityV2ActivityFeed } from "../components/activity-v2-activity-feed.tsx";
import { ActivityAccountsView } from "../components/activity-accounts-view.tsx";
import { ActivityV1ActiveLoansTable } from "../components/activity-v1-active-loans-table.tsx";
import { ActivityV1DefaultedLoansTable } from "../components/activity-v1-defaulted-loans-table.tsx";

const TABS = ["feed", "accounts", "active-loans", "defaulted-loans"] as const;
type TabValue = (typeof TABS)[number];

const ACTIVITY_TABS: { value: TabValue; label: string }[] = [
  { value: "feed", label: "Activity" },
  { value: "accounts", label: "Accounts" },
  { value: "active-loans", label: "Active Loans" },
  { value: "defaulted-loans", label: "Defaulted Loans" },
];

const TAB_COMPONENTS: Record<TabValue, ReactNode> = {
  feed: <ActivityV2ActivityFeed />,
  accounts: <ActivityAccountsView />,
  "active-loans": <ActivityV1ActiveLoansTable />,
  "defaulted-loans": <ActivityV1DefaultedLoansTable />,
};

export function CoolerActivityLayout() {
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("feed"));

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={tab} onValueChange={(val) => val && setTab(val as TabValue)}>
        <TabsList className="rounded-full w-fit">
          {ACTIVITY_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="rounded-full">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {TAB_COMPONENTS[tab]}
    </div>
  );
}
