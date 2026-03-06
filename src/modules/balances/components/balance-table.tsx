import { Link } from "react-router-dom";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type BalanceTableProps = {
  tokens: TokenEntry[];
};

type RowAction = {
  label: string;
  to?: string;
  disabled?: boolean;
};

function getAction(symbol: string, chainName: string): RowAction {
  switch (symbol) {
    case "OHM":
      return chainName === "Ethereum"
        ? { label: "Wrap", to: "/home/wrap" }
        : { label: "Bridge", to: "/home/bridge" };
    case "sOHM":
      return { label: "Wrap", to: "/home/wrap" };
    case "gOHM":
      return chainName === "Ethereum"
        ? { label: "Unwrap", to: "/home/unwrap" }
        : { label: "Bridge", to: "/home/bridge" };
    case "wsOHM":
    case "OHM v1":
    case "sOHM v1":
      return { label: "Migrate", disabled: true };
    default:
      return { label: "View", disabled: true };
  }
}

function formatBalance(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function BalanceTable({ tokens }: BalanceTableProps) {
  // Flatten tokens × chains into rows, only where balance > 0
  const rows: {
    key: string;
    token: TokenEntry;
    chain: ChainBalance;
    action: RowAction;
    usdValue: number;
  }[] = [];

  for (const token of tokens) {
    for (const chain of token.balances.balances) {
      if (chain.balance > 0n) {
        const action = getAction(token.symbol, chain.chainName);
        const usdValue = parseFloat(chain.formattedBalance) * token.price;
        rows.push({
          key: `${token.symbol}-${chain.chainId}`,
          token,
          chain,
          action,
          usdValue,
        });
      }
    }
  }

  if (rows.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Chain</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>
              <div className="flex items-center gap-2.5">
                <Icon name={row.token.icon} size={28} />
                <div>
                  <div className="font-medium">{row.token.label}</div>
                  {row.token.sublabel && (
                    <div className="text-xs text-tertiary-t">{row.token.sublabel}</div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <ChainIcon chainId={row.chain.chainId} />
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatBalance(row.chain.formattedBalance)}
            </TableCell>
            <TableCell className="text-right">{formatUsd(row.usdValue)}</TableCell>
            <TableCell className="text-right">
              {row.action.to ? (
                <Button variant="secondary" size="sm" render={<Link to={row.action.to} />}>
                  {row.action.label}
                </Button>
              ) : (
                <Badge variant="filled" color="gray" size="sm">
                  {row.action.label}
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
