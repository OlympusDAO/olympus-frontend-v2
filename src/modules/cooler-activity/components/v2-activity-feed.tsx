import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  useV2RecentActivity,
  useV2Liquidations,
  type V2Activity,
} from "@/lib/hooks/cooler/useV2Data";
import { formatUSD, formatGOHM, formatAddress } from "@/lib/hooks/cooler/utils";

function getActivityIcon(type: string) {
  switch (type) {
    case "borrow":
      return <TrendingDown className="size-4 text-red" />;
    case "repay":
      return <TrendingUp className="size-4 text-green" />;
    case "collateralAdd":
    case "collateral_add":
      return <TrendingUp className="size-4 text-blue" />;
    case "collateralWithdraw":
    case "collateral_withdraw":
      return <TrendingDown className="size-4 text-yellow" />;
    case "liquidation":
      return <AlertTriangle className="size-4 text-red" />;
    default:
      return null;
  }
}

function getActivityLabel(type: string): string {
  switch (type) {
    case "borrow":
      return "Borrow";
    case "repay":
      return "Repay";
    case "collateralAdd":
    case "collateral_add":
      return "Add Collateral";
    case "collateralWithdraw":
    case "collateral_withdraw":
      return "Withdraw Collateral";
    case "liquidation":
      return "Liquidation";
    default:
      return type;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

function formatActivityAmount(activity: V2Activity): string {
  if (activity.type.includes("collateral")) {
    return `${formatGOHM(activity.amount)} gOHM`;
  }
  return formatUSD(activity.amount);
}

function ActivityItem({ activity }: { activity: V2Activity }) {
  return (
    <div className="flex items-center justify-between bg-surface-a3 rounded-xl p-3">
      <div className="flex items-center gap-3">
        {getActivityIcon(activity.type)}
        <div>
          <div className="font-medium text-sm">
            {getActivityLabel(activity.type)}
          </div>
          <div className="text-xs text-secondary-t">
            {formatAddress(activity.account)} &middot;{" "}
            {formatDate(activity.timestamp)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-sm">
          {formatActivityAmount(activity)}
        </div>
        <a
          href={`https://etherscan.io/tx/${activity.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-secondary-t hover:text-primary-t transition-colors"
        >
          View Tx
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="h-5 w-32 bg-surface-a5 rounded animate-pulse mb-4" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-surface-a5 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

export function V2ActivityFeed() {
  const { data: recentActivity, isLoading: activityLoading } =
    useV2RecentActivity();
  const { data: liquidations, isLoading: liquidationsLoading } =
    useV2Liquidations();

  if (activityLoading || liquidationsLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="flex flex-col gap-3">
          {recentActivity && recentActivity.length > 0 ? (
            recentActivity
              .slice(0, 10)
              .map((activity: V2Activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
          ) : (
            <p className="text-sm text-secondary-t py-4 text-center">
              No recent activity
            </p>
          )}
        </div>
      </Card>

      {/* Recent Liquidations */}
      {liquidations && liquidations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="size-5 text-red" />
            Recent Liquidations
          </h3>
          <div className="flex flex-col gap-3">
            {liquidations.slice(0, 5).map((liquidation: V2Activity) => (
              <div
                key={liquidation.id}
                className="flex items-center justify-between bg-surface-a5 rounded-xl p-3"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="size-4 text-red" />
                  <div>
                    <div className="font-medium text-sm">Liquidation</div>
                    <div className="text-xs text-secondary-t">
                      {formatAddress(liquidation.account)} &middot;{" "}
                      {formatDate(liquidation.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">
                    {formatUSD(liquidation.amount)}
                  </div>
                  <a
                    href={`https://etherscan.io/tx/${liquidation.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-secondary-t hover:text-primary-t transition-colors"
                  >
                    View Tx
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
