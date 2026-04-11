import { useState, useEffect, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Card } from "@/components/ui/card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { useBorrowers, type BorrowerStat } from "@/lib/hooks/cooler/useV1Data.ts";
import { formatUSD, formatAddress } from "@/lib/hooks/cooler/utils.ts";

function formatCollateral(value: string): string {
  return `${Number(value).toFixed(4)} gOHM`;
}

function formatUSDFromString(value: string): string {
  return formatUSD(Number(value));
}

function getEtherscanUrl(address: string): string {
  return `https://etherscan.io/address/${address}`;
}

const columns: ColumnDef<BorrowerStat>[] = [
  {
    accessorKey: "borrower",
    header: "Address",
    cell: ({ row }) => (
      <a
        href={getEtherscanUrl(row.original.borrower)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-secondary-t hover:text-primary-t transition-colors"
      >
        {formatAddress(row.original.borrower)}
      </a>
    ),
  },
  {
    accessorKey: "activeLoans",
    header: "Active Loans",
    sortingFn: (a, b) => a.original.activeLoans - b.original.activeLoans,
  },
  {
    accessorKey: "totalDefaultedLoans",
    header: "Defaulted",
    sortingFn: (a, b) => a.original.totalDefaultedLoans - b.original.totalDefaultedLoans,
  },
  {
    accessorKey: "totalLoanExtensions",
    header: "Extensions",
    sortingFn: (a, b) => a.original.totalLoanExtensions - b.original.totalLoanExtensions,
  },
  {
    accessorKey: "totalLoans",
    header: "Total Loans",
    sortingFn: (a, b) => a.original.totalLoans - b.original.totalLoans,
  },
  {
    accessorKey: "currentInterestDue",
    header: "Interest Due",
    cell: ({ row }) => formatUSDFromString(row.original.currentInterestDue),
    sortingFn: (a, b) =>
      Number(a.original.currentInterestDue) - Number(b.original.currentInterestDue),
  },
  {
    accessorKey: "currentCollateral",
    header: "Collateral",
    cell: ({ row }) => formatCollateral(row.original.currentCollateral),
    sortingFn: (a, b) =>
      Number(a.original.currentCollateral) - Number(b.original.currentCollateral),
  },
];

function LoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="h-5 w-40 bg-surface-a5 rounded animate-pulse mb-4" />
      <div className="h-64 bg-surface-a5 rounded animate-pulse" />
    </Card>
  );
}

export function ActivityV1BorrowersTable() {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useBorrowers();

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const borrowers = useMemo(
    () => data?.pages.flatMap((page) => page.borrowerStats_collection) ?? [],
    [data],
  );

  const [sorting, setSorting] = useState<SortingState>([{ id: "totalLoans", desc: true }]);

  const table = useReactTable({
    data: borrowers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    enableSorting: true,
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold">All-Time Borrowers</h3>
        <span className="bg-surface-a5 text-secondary-t text-xs font-medium px-2 py-0.5 rounded-full">
          Cooler V1
        </span>
      </div>

      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b-0">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "text-secondary-t font-normal",
                    header.column.getCanSort() && "cursor-pointer select-none",
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" && " \u25B2"}
                    {header.column.getIsSorted() === "desc" && " \u25BC"}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="border-b-0">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="border-b-0">
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-secondary-t py-4"
              >
                No borrowers found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-secondary-t">
          {borrowers.length} borrower{borrowers.length !== 1 ? "s" : ""} total
          {isFetchingNextPage && " (loading more...)"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm text-secondary-t">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
