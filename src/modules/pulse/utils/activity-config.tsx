import { RiArrowDownSLine, RiAlertLine, RiPriceTag3Line } from "@remixicon/react";
import type { ActivityType } from "@/lib/hooks/liveness/useActivityFeed";
import { Icon } from "@/components/icon.tsx";

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
    actionLabel: "W/D Collateral",
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
