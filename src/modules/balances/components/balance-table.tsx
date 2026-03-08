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
  // Flatten tokens × chains into rows, filtering out dust (< $0.01)
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
        const usdValue = parseFloat(chain.formattedBalance) * token.price;
        if (token.price > 0 && usdValue < 0.01) continue;
        const action = getAction(token.symbol, chain.chainName);
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
          <TableHead>Balance</TableHead>
          <TableHead>Price</TableHead>
          <TableHead />
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
            <TableCell>
              <div className="font-semibold">{formatBalance(row.chain.formattedBalance)}</div>
              <div className="text-xs text-secondary-t">{formatUsd(row.usdValue)}</div>
            </TableCell>
            <TableCell>
              <div className="font-semibold">{formatUsd(row.token.price)}</div>
            </TableCell>
            <TableCell className="text-right">
              {row.action.to ? (
                <Button render={<Link to={row.action.to} />}>{row.action.label}</Button>
              ) : (
                <Button disabled>{row.action.label}</Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
