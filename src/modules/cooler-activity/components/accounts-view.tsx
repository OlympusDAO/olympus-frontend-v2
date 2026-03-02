import { useState, useEffect, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ChevronUp, ChevronDown, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useV2Accounts, type V2Account } from "@/lib/hooks/cooler/useV2Data";
import { useBorrowers, type BorrowerStat } from "@/lib/hooks/cooler/useV1Data";
import { formatUSD, formatGOHM, formatAddress } from "@/lib/hooks/cooler/utils";

// ── V2 Accounts ──

type V2SortField = "collateral" | "debt";

function V2SortIcon({
  field,
  currentField,
  direction,
}: {
  field: V2SortField;
  currentField: V2SortField;
  direction: "asc" | "desc";
}) {
  if (currentField !== field) {
    return <ChevronUp className="size-4 text-disabled-t" />;
  }
  return direction === "asc" ? (
    <ChevronUp className="size-4 text-primary-t" />
  ) : (
    <ChevronDown className="size-4 text-primary-t" />
  );
}

function V2AccountsView() {
  const { data: allAccounts, isLoading } = useV2Accounts();

  const [sortField, setSortField] = useState<V2SortField>("collateral");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 25;

  // biome-ignore lint/correctness/useExhaustiveDependencies: setCurrentPage is a stable state setter
  useEffect(() => {
    setCurrentPage(1);
  }, [sortField, sortDirection, searchQuery]);

  const filteredAccounts = useMemo(() => {
    if (!allAccounts) return [];
    return allAccounts.filter((account: V2Account) => {
      if (!searchQuery) return true;
      return account.address.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [allAccounts, searchQuery]);

  const sortedAccounts = useMemo(() => {
    return [...filteredAccounts].sort((a: V2Account, b: V2Account) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filteredAccounts, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedAccounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAccounts = sortedAccounts.slice(startIndex, endIndex);

  const handleSort = (field: V2SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="h-10 w-full bg-surface-a5 rounded animate-pulse mb-4" />
        <div className="h-64 bg-surface-a5 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-secondary-t" />
        <Input
          type="text"
          placeholder="Search by wallet address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow className="border-b-0">
            <TableHead className="text-secondary-t font-normal">Account</TableHead>
            <TableHead
              className="text-secondary-t font-normal cursor-pointer select-none"
              onClick={() => handleSort("collateral")}
            >
              <div className="flex items-center gap-1">
                Collateral (gOHM)
                <V2SortIcon field="collateral" currentField={sortField} direction={sortDirection} />
              </div>
            </TableHead>
            <TableHead
              className="text-secondary-t font-normal cursor-pointer select-none"
              onClick={() => handleSort("debt")}
            >
              <div className="flex items-center gap-1">
                Debt (DAI)
                <V2SortIcon field="debt" currentField={sortField} direction={sortDirection} />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentAccounts.length > 0 ? (
            currentAccounts.map((account: V2Account) => (
              <TableRow key={account.address} className="border-b-0">
                <TableCell className="font-mono py-4">
                  <a
                    href={`https://etherscan.io/address/${account.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary-t hover:text-primary-t transition-colors"
                  >
                    {formatAddress(account.address)}
                  </a>
                </TableCell>
                <TableCell className="py-4">{formatGOHM(account.collateral)} gOHM</TableCell>
                <TableCell className="py-4">{formatUSD(account.debt)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow className="border-b-0">
              <TableCell colSpan={3} className="h-24 text-center text-secondary-t py-4">
                {searchQuery ? "No matching accounts" : "No accounts found"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-secondary-t">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedAccounts.length)} of{" "}
            {sortedAccounts.length} accounts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-secondary-t">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ── V1 Borrowers ──

function formatCollateral(value: string): string {
  return `${Number(value).toFixed(4)} gOHM`;
}

function formatUSDFromString(value: string): string {
  return formatUSD(Number(value));
}

const v1Columns: ColumnDef<BorrowerStat>[] = [
  {
    accessorKey: "borrower",
    header: "Address",
    cell: ({ row }) => (
      <a
        href={`https://etherscan.io/address/${row.original.borrower}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-secondary-t hover:text-primary-t transition-colors"
      >
        {formatAddress(row.original.borrower)}
      </a>
    ),
    filterFn: (row, _columnId, filterValue: string) => {
      return row.original.borrower.toLowerCase().includes(filterValue.toLowerCase());
    },
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

function V1BorrowersView() {
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
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data: borrowers,
    columns: v1Columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: { sorting, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      return row.original.borrower.toLowerCase().includes(filterValue.toLowerCase());
    },
    enableSorting: true,
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  if (isLoading) {
    return (
      <div>
        <div className="h-10 w-full bg-surface-a5 rounded animate-pulse mb-4" />
        <div className="h-64 bg-surface-a5 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-secondary-t" />
        <Input
          type="text"
          placeholder="Search by wallet address..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
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
                    {header.column.getIsSorted() === "asc" && " ▲"}
                    {header.column.getIsSorted() === "desc" && " ▼"}
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
                colSpan={v1Columns.length}
                className="h-24 text-center text-secondary-t py-4"
              >
                {globalFilter ? "No matching borrowers" : "No borrowers found"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-secondary-t">
          {table.getFilteredRowModel().rows.length} borrower
          {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
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
    </>
  );
}

// ── Combined Accounts View ──

export function AccountsView() {
  const [version, setVersion] = useState<"v2" | "v1">("v2");

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Accounts</h3>
        <Tabs value={version} onValueChange={(v) => setVersion(v as "v2" | "v1")}>
          <TabsList className="rounded-full">
            <TabsTrigger value="v2" className="rounded-full">
              V2
            </TabsTrigger>
            <TabsTrigger value="v1" className="rounded-full">
              V1
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {version === "v2" ? <V2AccountsView /> : <V1BorrowersView />}
    </Card>
  );
}
