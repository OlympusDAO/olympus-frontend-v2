import { useState, useMemo } from "react";
import { ExternalLink, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useAccount } from "wagmi";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useBridgeHistory, type BridgeHistoryItem } from "@/lib/hooks/bridge/useBridgeHistory";
import { getBridgeChain } from "../constants";
import { getBlockExplorerTxUrl, shortenAddress } from "@/lib/helpers";
import type { Address } from "viem";
import { Card } from "@/components/ui/card";

const PAGE_SIZE = 20;

export function BridgeHistory() {
  const { address } = useAccount();
  const { history, isLoading } = useBridgeHistory();
  const [page, setPage] = useState(0);

  const totalItems = history.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedItems = useMemo(
    () => history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [history, page],
  );

  // Disconnected empty state
  if (!address) {
    return (
      <Card className="flex items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center py-16 px-8">
          <div className="w-16 h-16 rounded-2xl bg-surface-a3 flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-tertiary-t" />
          </div>
          <p className="text-sm font-medium text-primary-t mb-1">
            Connect your wallet to view bridging history.
          </p>
          <p className="text-xs text-tertiary-t">
            Your OHM transfers between networks will appear here once completed.
          </p>
        </div>
      </Card>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <Card className="flex items-center justify-center">
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-secondary-t">Loading bridge history...</p>
        </div>
      </Card>
    );
  }

  // No history
  if (totalItems === 0) {
    return (
      <Card className="flex items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center py-16 px-8">
          <div className="w-16 h-16 rounded-2xl bg-surface-a3 flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-tertiary-t" />
          </div>
          <p className="text-sm text-secondary-t">You have not bridged any OHM recently.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chain</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Transactions</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => (
              <HistoryRow key={`${item.srcTxHash}-${item.srcChainId}`} item={item} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedItems.map((item) => (
          <MobileHistoryCard key={`${item.srcTxHash}-${item.srcChainId}`} item={item} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-secondary-t">
          <span>
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalItems)} out of{" "}
            {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="xs"
              variant="tertiary"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="xs"
              variant="tertiary"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ item }: { item: BridgeHistoryItem }) {
  const srcChain = getBridgeChain(item.srcChainId);
  const dstChain = getBridgeChain(item.dstChainId);
  const formattedDate = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "—";
  const formattedTime = item.timestamp
    ? new Date(item.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "";

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          {srcChain && <Icon name={srcChain.icon} size={20} />}
          <span className="text-xs text-tertiary-t">→</span>
          {dstChain && <Icon name={dstChain.icon} size={20} />}
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="text-sm">{formattedDate}</p>
          <p className="text-xs text-tertiary-t">{formattedTime}</p>
        </div>
      </TableCell>
      <TableCell>{Number(item.amount).toFixed(2)} OHM</TableCell>
      <TableCell>
        {item.srcTxHash && (
          <a
            href={getBlockExplorerTxUrl(item.srcChainId, item.srcTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue hover:text-blue-800 text-sm"
          >
            {shortenAddress(item.srcTxHash as Address, 4)}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={item.status} />
      </TableCell>
    </TableRow>
  );
}

function MobileHistoryCard({ item }: { item: BridgeHistoryItem }) {
  const srcChain = getBridgeChain(item.srcChainId);
  const dstChain = getBridgeChain(item.dstChainId);
  const formattedDate = item.timestamp ? new Date(item.timestamp).toLocaleDateString() : "—";

  return (
    <div className="rounded-xl bg-surface-a3 border border-a3-b p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {srcChain && <Icon name={srcChain.icon} size={16} />}
          <span className="text-xs text-tertiary-t">→</span>
          {dstChain && <Icon name={dstChain.icon} size={16} />}
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{Number(item.amount).toFixed(2)} OHM</span>
        <span className="text-xs text-tertiary-t">{formattedDate}</span>
      </div>
      {item.srcTxHash && (
        <a
          href={getBlockExplorerTxUrl(item.srcChainId, item.srcTxHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue text-xs"
        >
          {shortenAddress(item.srcTxHash as Address, 4)}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isDelivered = status === "DELIVERED";
  const isInflight = status === "INFLIGHT";

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        isDelivered
          ? "bg-green/20 text-green"
          : isInflight
            ? "bg-blue/20 text-blue"
            : "bg-destructive/20 text-destructive"
      }`}
    >
      {isDelivered ? "Delivered" : isInflight ? "In Flight" : status}
    </span>
  );
}
