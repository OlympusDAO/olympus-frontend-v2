import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/icon";
import { ChainIcon } from "@/components/chain-icon";
import type { MultiChainBalanceResult, ChainBalance } from "@/lib/hooks/useMultiChainBalance";

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
};

function getAction(symbol: string, chainName: string) {
  switch (symbol) {
    case "OHM":
      return chainName === "Ethereum"
        ? { label: "Wrap", to: "/ohm/wrap" }
        : { label: "Bridge", to: "/ohm/bridge" };
    case "sOHM":
      return { label: "Wrap", to: "/ohm/wrap" };
    case "gOHM":
      return chainName === "Ethereum"
        ? { label: "Unwrap", to: "/ohm/unwrap" }
        : { label: "Bridge", to: "/ohm/bridge" };
    default:
      return { label: "Migrate", disabled: true as const };
  }
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

export function BalanceCards({ tokens }: BalanceCardsProps) {
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
        const action = getAction(row.token.symbol, row.chain.chainName);
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
            {"to" in action && action.to ? (
              <Button size="sm" render={<Link to={action.to} />}>
                {action.label}
              </Button>
            ) : (
              <Button size="sm" disabled>
                {action.label}
              </Button>
            )}
          </div>
        );
      })}
    </Card>
  );
}
