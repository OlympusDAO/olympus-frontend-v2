import { useState, useMemo } from "react";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { Icon, type IconName } from "@/components/icon";
import { ChainIcon } from "@/components/chain-icon";
import { NumberFlow } from "@/components/ui/number-flow";
import { Button } from "@/components/ui/button";
import { TooltipInfo } from "@/components/ui/tooltip";
import { Segmented } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useOhmLiquidityPools } from "@/modules/ohm/hooks/useOhmLiquidityPools.ts";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { RiArrowRightUpLine } from "@remixicon/react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LiquidityPool = {
  id: string;
  tokenA: { symbol: string; iconName: IconName | null };
  tokenB: { symbol: string; iconName: IconName | null };
  chainId: number;
  tvl: number;
  apy: number;
  project: string;
  depositUrl: string;
  category: "stable" | "volatile" | "gohm";
};

type PoolFilter = "all" | "stable" | "volatile" | "gohm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TokenIcon({
  symbol,
  iconName,
  className,
}: {
  symbol: string;
  iconName: IconName | null;
  className?: string;
}) {
  if (iconName) {
    return <Icon name={iconName} size={28} className={className} />;
  }
  return (
    <div
      className={`w-7 h-7 rounded-full bg-surface-a10 flex items-center justify-center text-[10px] font-bold shrink-0 ${className ?? ""}`}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

function TokenPairIcon({
  tokenA,
  tokenB,
}: {
  tokenA: LiquidityPool["tokenA"];
  tokenB: LiquidityPool["tokenB"];
}) {
  return (
    <div className="flex items-center">
      <TokenIcon symbol={tokenA.symbol} iconName={tokenA.iconName} className="z-10" />
      <TokenIcon symbol={tokenB.symbol} iconName={tokenB.iconName} className="-ml-2" />
    </div>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: ColumnDef<LiquidityPool>[] = [
  {
    id: "pool",
    header: "Pool",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <TokenPairIcon tokenA={row.original.tokenA} tokenB={row.original.tokenB} />
        <span className="font-medium">
          {row.original.tokenA.symbol} / {row.original.tokenB.symbol}
        </span>
      </div>
    ),
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
    accessorKey: "apy",
    header: "APY",
    cell: ({ row }) => (
      <NumberFlow
        className="text-[15px]/[20px] font-semibold"
        value={row.original.apy}
        format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
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
              aria-label={`Deposit into ${row.original.tokenA.symbol}/${row.original.tokenB.symbol} pool`}
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

const FILTER_OPTIONS: { value: PoolFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stable", label: "Stable" },
  { value: "volatile", label: "Volatile" },
  { value: "gohm", label: "gOHM" },
];

// ─── Section component ────────────────────────────────────────────────────────

export function UtilityLiquidityPoolsSection() {
  const [filter, setFilter] = useState<PoolFilter>("all");
  const { data: pools = [], isLoading } = useOhmLiquidityPools();
  const data = useMemo(
    () => (filter === "all" ? pools : pools.filter((p) => p.category === filter)),
    [filter, pools],
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
          <TooltipInfo title="Liquidity Pools">
            <h2 className="text-xl font-semibold text-primary-t">Liquidity Pools</h2>
          </TooltipInfo>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="tertiary"
            render={
              <a
                href="https://defillama.com/yields?token=GOHM&token=OHM"
                target="_blank"
                rel="noreferrer"
                aria-label="Explore OHM pools on DefiLlama"
              />
            }
          >
            Explore More on DefiLlama <RiArrowRightUpLine size={16} />
          </Button>
          <Segmented
            value={filter}
            onValueChange={(v) => setFilter(v as PoolFilter)}
            options={FILTER_OPTIONS}
            size="sm"
          />
        </div>
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
                {Array.from({ length: 6 }).map((_, j) => (
                  <TableCell key={`skeleton-cell-${j}`}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-secondary-t">
                No pools found
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
