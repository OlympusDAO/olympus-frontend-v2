import { useState, useEffect, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLink, ChevronUp, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useActiveLoans,
  type ActiveLoan,
} from "@/lib/hooks/cooler/useV1Data";
import {
  formatUSD,
  formatAddress,
  calculateDaysUntilDefault,
} from "@/lib/hooks/cooler/utils";

function formatCollateral(value: string): string {
  return `${Number(value).toFixed(4)} gOHM`;
}

function formatUSDFromString(value: string): string {
  return formatUSD(Number(value));
}

function getEtherscanUrl(address: string): string {
  return `https://etherscan.io/address/${address}`;
}

const columns: ColumnDef<ActiveLoan>[] = [
  {
    id: "borrower",
    header: "Wallet",
    accessorFn: (row) => row.borrower.id,
    cell: ({ row }) => (
      <a
        href={getEtherscanUrl(row.original.borrower.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-secondary-t hover:text-primary-t transition-colors"
      >
        {formatAddress(row.original.borrower.id)}
      </a>
    ),
  },
  {
    accessorKey: "cooler",
    header: "Cooler",
    cell: ({ row }) => (
      <a
        href={getEtherscanUrl(row.original.cooler)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-secondary-t hover:text-primary-t transition-colors"
      >
        {formatAddress(row.original.cooler)}
        <ExternalLink className="size-3" />
      </a>
    ),
    sortingFn: (a, b) =>
      a.original.cooler.localeCompare(b.original.cooler),
  },
  {
    accessorKey: "currentExpiryTimestamp",
    header: "Expiry Date",
    cell: ({ row }) => {
      const date = new Date(
        Number(row.original.currentExpiryTimestamp) * 1000,
      );
      return <span>{date.toLocaleDateString()}</span>;
    },
    sortingFn: (a, b) =>
      Number(a.original.currentExpiryTimestamp) -
      Number(b.original.currentExpiryTimestamp),
  },
  {
    id: "daysUntilDefault",
    header: "Days Until Default",
    accessorFn: (row) =>
      calculateDaysUntilDefault(Number(row.currentExpiryTimestamp)),
    cell: ({ row }) => {
      const days = calculateDaysUntilDefault(
        Number(row.original.currentExpiryTimestamp),
      );
      return (
        <span className={days <= 7 ? "text-red font-bold" : ""}>
          {days}
        </span>
      );
    },
  },
  {
    accessorKey: "principal",
    header: "Principal",
    cell: ({ row }) => formatUSDFromString(row.original.principal),
    sortingFn: (a, b) =>
      Number(a.original.principal) - Number(b.original.principal),
  },
  {
    accessorKey: "interest",
    header: "Interest",
    cell: ({ row }) => formatUSDFromString(row.original.interest),
    sortingFn: (a, b) =>
      Number(a.original.interest) - Number(b.original.interest),
  },
  {
    accessorKey: "collateral",
    header: "Collateral",
    cell: ({ row }) => formatCollateral(row.original.collateral),
    sortingFn: (a, b) =>
      Number(a.original.collateral) - Number(b.original.collateral),
  },
  {
    accessorKey: "loanId",
    header: "Loan ID",
    sortingFn: (a, b) =>
      Number(a.original.loanId) - Number(b.original.loanId),
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

export function V1ActiveLoansTable() {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useActiveLoans();

  // Auto-fetch all pages
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const loans = useMemo(
    () => data?.pages.flatMap((page) => page.coolerLoans) ?? [],
    [data],
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: "currentExpiryTimestamp", desc: false },
  ]);

  const table = useReactTable({
    data: loans,
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
        <h3 className="text-lg font-semibold">Active Loans</h3>
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
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {header.column.getCanSort() && (
                      header.column.getIsSorted() === "asc"
                        ? <ChevronUp className="size-4" />
                        : header.column.getIsSorted() === "desc"
                          ? <ChevronDown className="size-4" />
                          : <ChevronUp className="size-4 text-disabled-t" />
                    )}
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
                No active loans found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-secondary-t">
          {loans.length} loan{loans.length !== 1 ? "s" : ""} total
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
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
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
