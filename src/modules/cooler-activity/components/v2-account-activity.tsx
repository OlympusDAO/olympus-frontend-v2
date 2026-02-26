import { useState, useEffect, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  Search,
} from "lucide-react";
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
import {
  useV2Accounts,
  type V2Account,
} from "@/lib/hooks/cooler/useV2Data";
import { formatUSD, formatGOHM, formatAddress } from "@/lib/hooks/cooler/utils";

type SortField = "collateral" | "debt";

function LoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="h-5 w-32 bg-surface-a5 rounded animate-pulse mb-4" />
      <div className="h-64 bg-surface-a5 rounded animate-pulse" />
    </Card>
  );
}

function SortIcon({
  field,
  currentField,
  direction,
}: {
  field: SortField;
  currentField: SortField;
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

export function V2AccountsTable() {
  const { data: allAccounts, isLoading } = useV2Accounts();

  const [sortField, setSortField] = useState<SortField>("collateral");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 25;

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold">V2 Accounts</h3>
        <span className="bg-surface-a5 text-secondary-t text-xs font-medium px-2 py-0.5 rounded-full">
          Cooler V2
        </span>
      </div>

      {/* Search */}
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
                <SortIcon
                  field="collateral"
                  currentField={sortField}
                  direction={sortDirection}
                />
              </div>
            </TableHead>
            <TableHead
              className="text-secondary-t font-normal cursor-pointer select-none"
              onClick={() => handleSort("debt")}
            >
              <div className="flex items-center gap-1">
                Debt (DAI)
                <SortIcon
                  field="debt"
                  currentField={sortField}
                  direction={sortDirection}
                />
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
              <TableCell
                colSpan={3}
                className="h-24 text-center text-secondary-t py-4"
              >
                {searchQuery ? "No matching accounts" : "No accounts found"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-secondary-t">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, sortedAccounts.length)} of{" "}
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
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
