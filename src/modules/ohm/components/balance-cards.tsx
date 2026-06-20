import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon, type IconName } from "@/components/icon.tsx";
import { ChainIcon } from "@/components/chain-icon.tsx";
import { Tooltip } from "@/components/ui/tooltip.tsx";
import type { MultiChainBalanceResult, ChainBalance } from "@/lib/hooks/useMultiChainBalance.tsx";
import { MIGRATION_TOOLTIP, type MigrationAction } from "./migration-action.ts";

type TokenEntry = {
  symbol: string;
  label: string;
  sublabel?: string;
  icon: IconName;
  balances: MultiChainBalanceResult;
  price: number;
};

type BalanceCardsProps = {
  tokens: TokenEntry[];
  migration?: MigrationAction;
  onUnstakeV1?: () => void;
  onUnwrapWsohm?: () => void;
};

type CardAction = {
  label: string;
  to?: string;
  disabled?: boolean;
  onClick?: () => void;
  tooltip?: string;
};

function getAction(
  symbol: string,
  chainName: string,
  migration?: MigrationAction,
  onUnstakeV1?: () => void,
  onUnwrapWsohm?: () => void,
): CardAction {
  const isHomeChain = chainName === "Ethereum" || chainName === "Sepolia";
  switch (symbol) {
    case "OHM":
      return isHomeChain
        ? { label: "Wrap", to: "/ohm/wrap" }
        : { label: "Bridge", to: "/ohm/bridge" };
    case "sOHM":
      return { label: "Wrap", to: "/ohm/wrap" };
    case "gOHM":
      return isHomeChain
        ? { label: "Unwrap", to: "/ohm/wrap?mode=unwrap" }
        : { label: "Bridge", to: "/ohm/bridge" };
    case "OHM v1":
      return getMigrateAction(migration);
    case "sOHM v1":
      return { label: "Unstake", onClick: onUnstakeV1 };
    case "wsOHM":
      return { label: "Unwrap", onClick: onUnwrapWsohm };
    default:
      return { label: "View", disabled: true };
  }
}

function getMigrateAction(migration?: MigrationAction): CardAction {
  if (!migration || migration.status === "loading") return { label: "Migrate", disabled: true };
  if (migration.status === "ready") return { label: "Migrate", onClick: migration.onMigrate };
  return {
    label: migration.status === "fully-migrated" ? "Migrated" : "Migrate",
    disabled: true,
    tooltip: MIGRATION_TOOLTIP[migration.status],
  };
}

function formatBalance(value: string, symbol: string): string {
  const num = parseFloat(value);
  if (num === 0) return `0 ${symbol}`;
  return `${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} ${symbol}`;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function BalanceCards({ tokens, migration, onUnstakeV1, onUnwrapWsohm }: BalanceCardsProps) {
  const rows: {
    key: string;
    token: TokenEntry;
    chain: ChainBalance;
  }[] = [];

  for (const token of tokens) {
    for (const chain of token.balances.balances) {
      if (chain.balance > 0n) {
        const usdValue = parseFloat(chain.formattedBalance) * token.price;
        if (token.price > 0 && usdValue < 0.01) continue;
        rows.push({
          key: `${token.symbol}-${chain.chainId}`,
          token,
          chain,
        });
      }
    }
  }

  if (rows.length === 0) return null;

  return (
    <Card className="divide-y divide-surface-a5">
      <div className="px-4 py-2.5 text-xs text-tertiary-t">Asset</div>
      {rows.map((row) => {
        const action = getAction(
          row.token.symbol,
          row.chain.chainName,
          migration,
          onUnstakeV1,
          onUnwrapWsohm,
        );
        const usdValue = parseFloat(row.chain.formattedBalance) * row.token.price;

        return (
          <div key={row.key} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Icon name={row.token.icon} size={32} />
                <div className="absolute -bottom-1 -right-1">
                  <ChainIcon chainId={row.chain.chainId} size={14} />
                </div>
              </div>
              <div>
                <div className="font-medium text-primary-t">
                  {formatBalance(row.chain.formattedBalance, row.token.label)}
                </div>
                <div className="text-xs text-tertiary-t">{formatUsd(usdValue)}</div>
              </div>
            </div>
            {action.to ? (
              <Button size="sm" render={<Link to={action.to} />}>
                {action.label}
              </Button>
            ) : action.tooltip ? (
              <Tooltip title={action.tooltip}>
                <span className="inline-flex">
                  <Button size="sm" disabled={action.disabled} onClick={action.onClick}>
                    {action.label}
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button size="sm" disabled={action.disabled} onClick={action.onClick}>
                {action.label}
              </Button>
            )}
          </div>
        );
      })}
    </Card>
  );
}
