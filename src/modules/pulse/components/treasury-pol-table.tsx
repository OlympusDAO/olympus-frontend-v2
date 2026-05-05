import { useMemo } from "react";
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NumberFlow } from "@/components/ui/number-flow";
import { TooltipInfo } from "@/components/ui/tooltip";
import { ChainIcon } from "@/components/chain-icon";
import { useLpPoolsData, type LpPoolRow } from "@/modules/pulse/hooks/useLpPoolsData";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    totalTvl?: number;
  }
}

const COMPACT_USD = {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
} as const;
const PERCENT_FORMAT = {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
} as const;

function stripLpSuffix(name: string): string {
  return name.replace(/ Liquidity Pool$/i, "").replace(/ LP$/i, "");
}

const SKELETON_ROWS = [
  "skeleton-row-1",
  "skeleton-row-2",
  "skeleton-row-3",
  "skeleton-row-4",
  "skeleton-row-5",
];
const SKELETON_CELLS = [
  "skeleton-cell-1",
  "skeleton-cell-2",
  "skeleton-cell-3",
  "skeleton-cell-4",
  "skeleton-cell-5",
  "skeleton-cell-6",
  "skeleton-cell-7",
  "skeleton-cell-8",
];

const columnHelper = createColumnHelper<LpPoolRow>();

function EstimatedFeesCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-secondary-t">Unavailable</span>;
  return <NumberFlow value={value} format={COMPACT_USD} />;
}

const COLUMNS = [
  columnHelper.accessor("name", {
    header: "Pool",
    cell: (info) => (
      <span className="font-medium text-primary-t">{stripLpSuffix(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("protocol", {
    header: "Protocol",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("chainId", {
    header: "Chain",
    cell: (info) => <ChainIcon chainId={info.getValue()} size={16} />,
  }),
  columnHelper.accessor("tvl", {
    header: "TVL",
    cell: (info) => <NumberFlow value={info.getValue()} format={COMPACT_USD} />,
  }),
  columnHelper.accessor("weeklyFees", {
    header: () => (
      <TooltipInfo title="Estimated weekly fee run-rate derived from fee APY and Olympus-owned LP value. This is not observed fees collected by Olympus over the last 7 days.">
        Estimated Fees
      </TooltipInfo>
    ),
    cell: (info) => <EstimatedFeesCell value={info.getValue()} />,
  }),
  columnHelper.display({
    id: "polPct",
    header: "% of POL",
    cell: (info) => {
      const totalTvl = info.table.options.meta?.totalTvl ?? 0;
      const tvl = info.row.original.tvl;
      const pct = totalTvl > 0 ? tvl / totalTvl : 0;
      return <NumberFlow value={pct} format={PERCENT_FORMAT} />;
    },
  }),
  columnHelper.accessor("ohmPct", {
    header: "OHM %",
    cell: (info) => <NumberFlow value={info.getValue()} format={PERCENT_FORMAT} />,
  }),
  columnHelper.accessor("ohmDepth", {
    header: "OHM Depth",
    cell: (info) => <NumberFlow value={info.getValue()} format={COMPACT_USD} />,
  }),
];

export function TreasuryPolTable() {
  const { data: rows, isLoading } = useLpPoolsData();

  const totalTvl = useMemo(() => (rows ?? []).reduce((s, r) => s + r.tvl, 0), [rows]);
  const totalFees = useMemo(
    () => (rows ?? []).reduce((s, r) => s + (r.weeklyFees ?? 0), 0),
    [rows],
  );
  const totalOhmDepth = useMemo(() => (rows ?? []).reduce((s, r) => s + r.ohmDepth, 0), [rows]);

  const table = useReactTable({
    data: rows ?? [],
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    meta: { totalTvl },
  });

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h3 className="text-[18px]/[20px] font-semibold">Protocol-Owned Liquidity</h3>
        <p className="mt-1 text-xs text-secondary-t">
          Dedicated view for Olympus-owned liquidity positions, separated from the balance sheet.
          Fees are APY-derived estimates, not observed collections.
        </p>
      </div>

      <Separator />

      {isLoading ? (
        <Table variant="condensed">
          <TableBody>
            {SKELETON_ROWS.map((rowKey) => (
              <TableRow key={rowKey}>
                {SKELETON_CELLS.map((cellKey) => (
                  <TableCell key={cellKey}>
                    <Skeleton className="h-4 w-20 rounded-md" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Table variant="condensed">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className={header.index > 2 ? "text-right" : ""}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-sm/5 font-semibold text-secondary-t"
                >
                  No LP positions found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell, i) => (
                    <TableCell key={cell.id} className={i > 2 ? "text-right" : ""}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-bold text-primary-t">
                Total
              </TableCell>
              <TableCell className="text-right font-bold text-primary-t">
                <NumberFlow value={totalTvl} format={COMPACT_USD} />
              </TableCell>
              <TableCell className="text-right font-bold text-primary-t">
                <NumberFlow value={totalFees} format={COMPACT_USD} />
              </TableCell>
              <TableCell className="text-right text-secondary-t">—</TableCell>
              <TableCell className="text-right text-secondary-t">—</TableCell>
              <TableCell className="text-right font-bold text-primary-t">
                <NumberFlow value={totalOhmDepth} format={COMPACT_USD} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </Card>
  );
}
