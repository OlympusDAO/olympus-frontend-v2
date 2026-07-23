import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon, type IconName } from "@/components/icon.tsx";
import { ChainIcon } from "@/components/chain-icon.tsx";
import { Tooltip } from "@/components/ui/tooltip.tsx";
import type { MultiChainBalanceResult, ChainBalance } from "@/lib/hooks/useMultiChainBalance.tsx";
import {
  getTokenAction,
  type MigrationAction,
  type TokenAction,
} from "@/modules/ohm/components/migration-action.ts";

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
  migration?: MigrationAction;
  onUnstakeV1?: () => void;
  onUnwrapWsohm?: () => void;
};

type Row = {
  key: string;
  token: TokenEntry;
  chain: ChainBalance;
  action: TokenAction;
  usdValue: number;
};

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

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("token", {
    header: "Asset",
    cell: ({ getValue }) => {
      const token = getValue();
      return (
        <div className="flex items-center gap-2.5">
          <Icon name={token.icon} className="size-9" />
          <div>
            <div className="text-sm/5 font-medium">{token.label}</div>
            {token.sublabel && (
              <div className="text-xs/4 font-normal text-secondary-t">{token.sublabel}</div>
            )}
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor("chain", {
    header: "Chain",
    cell: ({ getValue }) => <ChainIcon chainId={getValue().chainId} size={24} />,
  }),
  columnHelper.accessor(
    (row) => ({ balance: row.chain.formattedBalance, usdValue: row.usdValue }),
    {
      id: "balance",
      header: "Balance",
      cell: ({ getValue }) => {
        const { balance, usdValue } = getValue();
        return (
          <>
            <div className="text-sm/5 font-semibold">{formatBalance(balance)}</div>
            <div className="text-xs/4 font-normal text-secondary-t">{formatUsd(usdValue)}</div>
          </>
        );
      },
    },
  ),
  columnHelper.accessor((row) => row.token.price, {
    id: "price",
    header: "Price",
    cell: ({ getValue }) => <div className="text-sm/5 font-semibold">{formatUsd(getValue())}</div>,
  }),
  columnHelper.accessor("action", {
    header: "",
    cell: ({ getValue }) => {
      const action = getValue();
      if (action.to) {
        return <Button render={<Link to={action.to} />}>{action.label}</Button>;
      }
      const button = (
        <Button disabled={action.disabled} onClick={action.onClick}>
          {action.label}
        </Button>
      );
      return action.tooltip ? (
        <Tooltip title={action.tooltip}>
          <span className="inline-flex">{button}</span>
        </Tooltip>
      ) : (
        button
      );
    },
  }),
];

export function BalanceTable({ tokens, migration, onUnstakeV1, onUnwrapWsohm }: BalanceTableProps) {
  const data = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    for (const token of tokens) {
      for (const chain of token.balances.balances) {
        if (chain.balance > 0n) {
          const usdValue = parseFloat(chain.formattedBalance) * token.price;
          if (token.price > 0 && usdValue < 0.01) continue;
          rows.push({
            key: `${token.symbol}-${chain.chainId}`,
            token,
            chain,
            action: getTokenAction(
              token.symbol,
              chain.chainName,
              migration,
              onUnstakeV1,
              onUnwrapWsohm,
            ),
            usdValue,
          });
        }
      }
    }
    return rows;
  }, [tokens, migration, onUnstakeV1, onUnwrapWsohm]);

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.key,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cell.column.id === "action" ? "text-right" : undefined}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
