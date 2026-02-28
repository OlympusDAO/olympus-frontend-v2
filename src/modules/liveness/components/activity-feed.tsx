import { useState } from "react";
import { Card } from "@/components/ui/card";
import { DataSource } from "./data-source";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useActivityFeed,
  type ActivityItem,
  type ActivityType,
} from "@/lib/hooks/liveness/useActivityFeed";
import { formatDistanceToNow } from "date-fns";
import { formatAddress } from "@/lib/liveness/formatters";
import { RiExternalLinkLine } from "@remixicon/react";
import { ETHERSCAN_BASE_URL } from "@/lib/constants";

const TYPE_CONFIG: Record<
  ActivityType,
  { label: string; verb: string; badgeClass: string }
> = {
  "cd-bid": {
    label: "CD Bid",
    verb: "deposited",
    badgeClass: "border-purple/20 bg-purple/10 text-purple",
  },
  "cd-converted": {
    label: "CD Convert",
    verb: "converted",
    badgeClass: "border-green/20 bg-green/10 text-green",
  },
  "cd-yield": {
    label: "CD Yield",
    verb: "claimed",
    badgeClass: "border-yellow/20 bg-yellow/10 text-yellow",
  },
  "cd-loan": {
    label: "CD Loan",
    verb: "borrowed",
    badgeClass: "border-purple/20 bg-purple/10 text-purple",
  },
  "cd-repay": {
    label: "CD Repay",
    verb: "repaid",
    badgeClass: "border-green/20 bg-green/10 text-green",
  },
  "cd-redemption": {
    label: "CD Redeem",
    verb: "redeemed",
    badgeClass: "border-yellow/20 bg-yellow/10 text-yellow",
  },
  "yrf-purchase": {
    label: "YRF Buy",
    verb: "repurchased",
    badgeClass: "border-blue/20 bg-blue/10 text-blue",
  },
  "cooler-borrow": {
    label: "Cooler Borrow",
    verb: "borrowed",
    badgeClass: "border-orange/20 bg-orange/10 text-orange",
  },
  "cooler-repay": {
    label: "Cooler Repay",
    verb: "repaid",
    badgeClass: "border-orange/20 bg-orange/10 text-orange",
  },
  "cooler-add-collateral": {
    label: "Cooler Add",
    verb: "added collateral",
    badgeClass: "border-orange/20 bg-orange/10 text-orange",
  },
  "cooler-withdraw-collateral": {
    label: "Cooler W/D",
    verb: "withdrew collateral",
    badgeClass: "border-orange/20 bg-orange/10 text-orange",
  },
  "cooler-liquidation": {
    label: "Cooler Liq.",
    verb: "liquidated",
    badgeClass: "border-red/20 bg-red/10 text-red",
  },
};

type Filter = "all" | "cd" | "yrf" | "cooler";

function FeedRow({ item }: { item: ActivityItem }) {
  const config = TYPE_CONFIG[item.type];
  const linkTarget = item.txHash
    ? `${ETHERSCAN_BASE_URL}/tx/${item.txHash}`
    : item.address
      ? `${ETHERSCAN_BASE_URL}/address/${item.address}`
      : null;

  const row = (
    <div className="flex items-start gap-2.5 px-4 py-3 sm:items-center sm:gap-3 sm:px-6">
      {/* Type badge */}
      <span
        className={`mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight sm:mt-0 sm:px-2 sm:text-[11px] ${config.badgeClass}`}
        style={{ minWidth: "56px", textAlign: "center" }}
      >
        {config.label}
      </span>

      {/* Description + timestamp */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm leading-snug">
            {item.address ? (
              <>
                <span className="font-mono font-medium">{formatAddress(item.address)}</span>
                {" "}
                <span className="text-secondary-t">{config.verb}</span>
              </>
            ) : (
              <>
                <span className="font-medium">Protocol</span>
                {" "}
                <span className="text-secondary-t">{config.verb}</span>
              </>
            )}
            {" "}
            <span className="font-medium">{item.primaryValue}</span>
          </p>
          <span className="text-xs tabular-nums text-tertiary-t whitespace-nowrap">
            {formatDistanceToNow(item.timestamp * 1000, { addSuffix: true })}
          </span>
        </div>
        <p className="text-xs leading-snug text-tertiary-t">{item.secondaryValue}</p>
      </div>

      {/* Link icon */}
      {linkTarget && (
        <RiExternalLinkLine
          size={14}
          className="mt-1 shrink-0 text-tertiary-t transition-colors sm:mt-0 group-hover:text-secondary-t"
        />
      )}
    </div>
  );

  if (linkTarget) {
    return (
      <a
        href={linkTarget}
        target="_blank"
        rel="noopener noreferrer"
        className="group block border-b border-a10-b last:border-b-0 transition-colors hover:bg-surface-a3"
      >
        {row}
      </a>
    );
  }

  return (
    <div className="border-b border-a10-b last:border-b-0">{row}</div>
  );
}

export function ActivityFeed() {
  const { data: items, isLoading } = useActivityFeed();
  const [filter, setFilter] = useState<Filter>("all");

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="mb-4 h-4 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </Card>
    );
  }

  const filteredItems = (items || []).filter((item) => {
    if (filter === "all") return true;
    if (filter === "cd") return item.type.startsWith("cd-");
    if (filter === "yrf") return item.type === "yrf-purchase";
    if (filter === "cooler") return item.type.startsWith("cooler-");
    return true;
  });

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs font-medium uppercase tracking-widest text-secondary-t">
          Activity Feed
        </p>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="cd">CD</TabsTrigger>
            <TabsTrigger value="yrf">YRF</TabsTrigger>
            <TabsTrigger value="cooler">Cooler</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-tertiary-t">
          No recent activity
        </p>
      ) : (
        <div className="max-h-[480px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--surface-a10)_transparent]">
          {filteredItems.map((item) => (
            <FeedRow key={item.id} item={item} />
          ))}
        </div>
      )}
      <div className="px-4 pb-4 sm:px-6">
        <DataSource sources={["CD Subgraph", "Bond Subgraph", "Cooler Subgraph"]} />
      </div>
    </Card>
  );
}
