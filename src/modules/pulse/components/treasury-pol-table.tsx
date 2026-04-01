import { useMemo } from "react";
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";
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
import { ChainIcon } from "@/components/chain-icon";
import { useLpPoolsData, type LpPoolRow } from "@/modules/pulse/hooks/useLpPoolsData";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    totalTvl: number;
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

const columnHelper = createColumnHelper<LpPoolRow>();

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
    cell: (info) => <ChainIcon chainId={info.getValue()} size={20} />,
  }),
  columnHelper.accessor("tvl", {
    header: "TVL",
    cell: (info) => <NumberFlow value={info.getValue()} format={COMPACT_USD} />,
  }),
  columnHelper.accessor("weeklyFees", {
    header: "7d Fees",
    cell: (info) => <NumberFlow value={info.getValue()} format={COMPACT_USD} />,
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
    cell: () => <NumberFlow value={0.5} format={PERCENT_FORMAT} />,
  }),
  columnHelper.accessor("ohmDepth", {
    header: "OHM Depth",
    cell: (info) => <NumberFlow value={info.getValue()} format={COMPACT_USD} />,
  }),
];

export function TreasuryPolTable() {
  const { data: rows, isLoading } = useLpPoolsData();

  const totalTvl = useMemo(() => (rows ?? []).reduce((s, r) => s + r.tvl, 0), [rows]);
  const totalFees = useMemo(() => (rows ?? []).reduce((s, r) => s + r.weeklyFees, 0), [rows]);
  const totalOhmDepth = useMemo(() => (rows ?? []).reduce((s, r) => s + r.ohmDepth, 0), [rows]);

  const table = useReactTable({
    data: rows ?? [],
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    meta: { totalTvl },
  });

  return isLoading ? (
    <Table>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: 8 }).map((__, j) => (
              <TableCell key={j}>
                <Skeleton className="h-4 w-20 rounded-md" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ) : (
    <Table>
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
            <TableCell colSpan={8} className="py-12 text-center text-sm text-tertiary-t">
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
  );
}
