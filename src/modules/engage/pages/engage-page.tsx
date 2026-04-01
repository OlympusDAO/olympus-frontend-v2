import type { FC } from "react";
import { useAccount } from "wagmi";
import { EngageStats } from "@/modules/engage/components/engage-stats.tsx";
import { UserStats } from "@/modules/engage/components/user-stats.tsx";
import { ClaimTable } from "@/modules/engage/components/claim-table.tsx";
import { ConvertTable } from "@/modules/engage/components/convert-table.tsx";
import { LeaderboardTable } from "@/modules/engage/components/leaderboard-table.tsx";
import { WalletNotConnected } from "@/modules/engage/components/wallet-not-connected.tsx";
import { EngageActions } from "@/modules/engage/components/engage-actions.tsx";
import { EngageFaq } from "@/modules/engage/components/engage-faq.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";

const TABS = [
  { value: "claim", label: "Claim" },
  { value: "convert", label: "Convert" },
  { value: "actions", label: "Actions" },
  { value: "leaderboard", label: "Leaderboard" },
  { value: "faq", label: "FAQ" },
];

export const EngagePage: FC = () => {
  const { isConnected } = useAccount();

  return (
    <section>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0 flex flex-col">
          <EngageStats />
        </div>
        <div className="w-full lg:w-[320px] lg:shrink-0 flex flex-col">
          <UserStats />
        </div>
      </div>

      <Tabs defaultValue="claim" variant="primary" className="mt-6">
        <TabsList variant="primary">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} variant="primary">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="claim" className="mt-4">
          {isConnected ? (
            <ClaimTable />
          ) : (
            <WalletNotConnected description="Please connect your wallet to see your claim amount" />
          )}
        </TabsContent>
        <TabsContent value="convert" className="mt-4">
          {isConnected ? (
            <ConvertTable />
          ) : (
            <WalletNotConnected description="Please connect your wallet to see your convert amount" />
          )}
        </TabsContent>
        <TabsContent value="actions" className="mt-4">
          <EngageActions />
        </TabsContent>
        <TabsContent value="leaderboard" className="mt-4">
          <LeaderboardTable />
        </TabsContent>
        <TabsContent value="faq" className="mt-4">
          <EngageFaq />
        </TabsContent>
      </Tabs>
    </section>
  );
};
