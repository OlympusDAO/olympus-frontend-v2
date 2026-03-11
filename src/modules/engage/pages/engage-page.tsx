import type { FC } from "react";
import { EngageStats } from "@/modules/engage/components/engage-stats.tsx";
import { UserStats } from "@/modules/engage/components/user-stats.tsx";

export const EngagePage: FC = () => {
  return (
    <section>
      <div className="flex gap-4">
        <div className="flex-1 min-w-0 flex flex-col">
          <EngageStats />
        </div>
        <div className="w-[320px] shrink-0 flex flex-col">
          <UserStats />
        </div>
      </div>
    </section>
  );
};
