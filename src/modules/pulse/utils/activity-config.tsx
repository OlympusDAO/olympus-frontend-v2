import {
  RiArrowDownSLine,
  RiAlertLine,
  RiPriceTag3Line,
  RiArrowRightUpLine,
} from "@remixicon/react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import type { ActivityItem, ActivityType } from "@/lib/hooks/liveness/useActivityFeed";
import { Icon } from "@/components/icon.tsx";
import { Badge } from "@/components/ui/badge";
import { ExplorerLink } from "@/components/explorer-link";
import { formatAddress } from "@/lib/liveness/formatters";

export type Protocol = "YRF" | "CD" | "Cooler";

export interface ActivityTypeConfig {
  protocol: Protocol;
  actionLabel: string;
  icon: React.ReactNode;
  verb: string;
}

const iconClass = "size-4";

export const TYPE_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  "yrf-purchase": {
    protocol: "YRF",
    actionLabel: "Repurchase",
    icon: <Icon name="convOHMIcon" className={iconClass} />,
    verb: "repurchased",
  },
  "cd-bid": {
    protocol: "CD",
    actionLabel: "Bid",
    icon: <RiPriceTag3Line className={iconClass} />,
    verb: "deposited",
  },
  "cd-converted": {
    protocol: "CD",
    actionLabel: "Convert",
    icon: <Icon name="convOHMIcon" className={iconClass} />,
    verb: "converted",
  },
  "cd-yield": {
    protocol: "CD",
    actionLabel: "Yield",
    icon: <Icon name="coinsLineIcon" className={iconClass} />,
    verb: "claimed",
  },
  "cd-loan": {
    protocol: "CD",
    actionLabel: "Loan",
    icon: <Icon name="arrowBigUpDashIcon" className={iconClass} />,
    verb: "borrowed",
  },
  "cd-repay": {
    protocol: "CD",
    actionLabel: "Repay",
    icon: <RiArrowDownSLine className={iconClass} />,
    verb: "repaid",
  },
  "cd-redemption": {
    protocol: "CD",
    actionLabel: "Redeem",
    icon: <Icon name="banknoteArrowDownIcon" className={iconClass} />,
    verb: "redeemed",
  },
  "cooler-borrow": {
    protocol: "Cooler",
    actionLabel: "Borrow",
    icon: <Icon name="arrowBigUpDashIcon" className={iconClass} />,
    verb: "borrowed",
  },
  "cooler-repay": {
    protocol: "Cooler",
    actionLabel: "Repay",
    icon: <RiArrowDownSLine className={iconClass} />,
    verb: "repaid",
  },
  "cooler-add-collateral": {
    protocol: "Cooler",
    actionLabel: "Add Collateral",
    icon: <Icon name="diamondPlusIcon" className={iconClass} />,
    verb: "added collateral",
  },
  "cooler-withdraw-collateral": {
    protocol: "Cooler",
    actionLabel: "Withdraw Collateral",
    icon: <Icon name="banknoteArrowDownIcon" className={iconClass} />,
    verb: "withdrew collateral",
  },
  "cooler-liquidation": {
    protocol: "Cooler",
    actionLabel: "Liquidation",
    icon: <RiAlertLine className={iconClass} />,
    verb: "liquidated",
  },
};

export const PROTOCOL_BADGE: Record<Protocol, "blue" | "orange" | "red"> = {
  YRF: "blue",
  CD: "orange",
  Cooler: "red",
};

// ── Shared table columns ───────────────────────────────────────────────────────

const MAINNET_CHAIN_ID = 1;
const columnHelper = createColumnHelper<ActivityItem>();

export const ACTIVITY_COLUMNS: ColumnDef<ActivityItem, unknown>[] = [
  columnHelper.display({
    id: "protocol",
    cell: ({ row }) => {
      const config = TYPE_CONFIG[row.original.type];
      return (
        <Badge variant="filled" size="md" color={PROTOCOL_BADGE[config.protocol]}>
          {config.protocol}
        </Badge>
      );
    },
  }),
  columnHelper.display({
    id: "action",
    cell: ({ row }) => {
      const config = TYPE_CONFIG[row.original.type];
      return (
        <div className="flex items-center gap-x-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-a5 border border-a3-b text-secondary-t">
            {config.icon}
          </div>
          <span className="text-sm/5 font-semibold">{config.actionLabel}</span>
        </div>
      );
    },
  }),
  columnHelper.display({
    id: "description",
    cell: ({ row }) => {
      const item = row.original;
      const config = TYPE_CONFIG[item.type];
      return (
        <div className="min-w-0 flex-1">
          <p className="text-sm/5 font-semibold">
            {item.address ? <span>{formatAddress(item.address)}</span> : <span>Protocol</span>}{" "}
            <span className="text-secondary-t">{config.verb}</span> <span>{item.primaryValue}</span>
          </p>
          <p className="text-xs/4 font-normal text-tertiary-t">{item.secondaryValue}</p>
        </div>
      );
    },
  }),
  columnHelper.display({
    id: "time",
    cell: ({ row }) => {
      const item = row.original;
      const txLink = item.txHash
        ? `/tx/${item.txHash}`
        : item.address
          ? `/address/${item.address}`
          : null;

      const timeText = (
        <span className="whitespace-nowrap text-sm/5 font-normal tabular-nums text-tertiary-t">
          {formatDistanceToNow(item.timestamp * 1000, { addSuffix: true })}
        </span>
      );

      if (!txLink) return timeText;

      return (
        <ExplorerLink
          chainId={MAINNET_CHAIN_ID}
          href={txLink}
          className="flex items-center gap-x-1 text-sm/5 text-secondary-t"
        >
          {timeText}
          <RiArrowRightUpLine size={16} />
        </ExplorerLink>
      );
    },
  }),
];
