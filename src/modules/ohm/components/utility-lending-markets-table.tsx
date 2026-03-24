import { useState, useMemo } from "react";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import type { IconName } from "@/components/icon";
import { ChainIcon } from "@/components/chain-icon";
import { NumberFlow } from "@/components/ui/number-flow";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/tabs";
import { useOhmLendingMarkets } from "@/modules/ohm/hooks/useOhmLendingMarkets.ts";
import { TokenIcon } from "@/modules/ohm/components/utility-token-icon.tsx";
import type { LendingMarket } from "@/modules/ohm/utils/defi-llama.ts";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { RiArrowRightUpLine } from "@remixicon/react";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipInfo } from "@/components/ui/tooltip.tsx";

type MarketFilter = "all" | "ohm" | "gohm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TokenCell({ token }: { token: { symbol: string; iconName: IconName | null } }) {
  return (
    <div className="flex items-center gap-2">
      <TokenIcon symbol={token.symbol} iconName={token.iconName} />
      <span className="font-medium">{token.symbol}</span>
    </div>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: ColumnDef<LendingMarket>[] = [
  {
    id: "lend",
    header: "Lend",
    cell: ({ row }) => <TokenCell token={row.original.lend} />,
  },
  {
    id: "borrow",
    header: "Borrow",
    cell: ({ row }) => <TokenCell token={row.original.borrow} />,
  },
  {
    id: "network",
    header: "Network",
    cell: ({ row }) => <ChainIcon chainId={row.original.chainId} />,
  },
  {
    accessorKey: "tvl",
    header: "TVL",
    cell: ({ row }) => (
      <NumberFlow
        className="text-[15px]/[20px] font-semibold"
        value={row.original.tvl}
        format={{
          style: "currency",
          currency: "USD",
          notation: "standard",
          maximumFractionDigits: 0,
        }}
      />
    ),
  },
  {
    accessorKey: "supplyApy",
    header: "Supply APY",
    cell: ({ row }) => (
      <NumberFlow
        className="text-[15px]/[20px] font-semibold"
        value={row.original.supplyApy}
        format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
      />
    ),
  },
  {
    accessorKey: "borrowApy",
    header: "Borrow APY",
    cell: ({ row }) => (
      <NumberFlow
        className="text-[15px]/[20px] font-semibold"
        value={row.original.borrowApy}
        format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
      />
    ),
  },
  {
    accessorKey: "available",
    header: "Available",
    cell: ({ row }) => (
      <NumberFlow
        className="text-[15px]/[20px] font-semibold"
        value={row.original.available}
        format={{
          style: "currency",
          currency: "USD",
          notation: "standard",
          maximumFractionDigits: 0,
        }}
      />
    ),
  },
  {
    accessorKey: "project",
    header: "Project",
    cell: ({ row }) => <p className="text-[15px]/[20px] font-semibold">{row.original.project}</p>,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="md"
          render={
            <a
              href={row.original.depositUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Deposit ${row.original.lend.symbol} on ${row.original.project}`}
            />
          }
        >
          Deposit <RiArrowRightUpLine size={20} />
        </Button>
      </div>
    ),
  },
];

// ─── Filter options ───────────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: MarketFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ohm", label: "OHM" },
  { value: "gohm", label: "gOHM" },
];

// ─── Section component ────────────────────────────────────────────────────────

export function UtilityLendingMarketsSection() {
  const [filter, setFilter] = useState<MarketFilter>("all");
  const { data: markets = [], isLoading } = useOhmLendingMarkets();
  const data = useMemo(
    () => (filter === "all" ? markets : markets.filter((m) => m.token === filter)),
    [filter, markets],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TooltipInfo title="Lending Markets">
            <h2 className="text-xl font-semibold text-primary-t">Lending Markets</h2>
          </TooltipInfo>
        </div>
        <Segmented
          value={filter}
          onValueChange={(v) => setFilter(v as MarketFilter)}
          options={FILTER_OPTIONS}
          size="sm"
        />
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-surface-a5">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={`skeleton-row-${i}`}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <TableCell key={`skeleton-cell-${j}`}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-secondary-t">
                No markets found
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
