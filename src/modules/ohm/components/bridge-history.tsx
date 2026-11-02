import { useMemo } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  RiExchangeFill,
  RiWalletFill,
  RiArrowRightSLine,
  RiExternalLinkLine,
  RiInformationLine,
} from "@remixicon/react";
import { useAccount } from "wagmi";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Icon } from "@/components/icon.tsx";
import { ChainIcon } from "@/components/chain-icon.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Spinner } from "@/components/spinner.tsx";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table.tsx";
import type { BridgeStatus } from "@/lib/hooks/bridge/bridgeStatus";
import { getCcipExplorerUrl } from "@/lib/hooks/bridge/ccipApi";
import { useBridgeHistory, type BridgeHistoryItem } from "@/lib/hooks/bridge/useBridgeHistory.ts";
import { useRetryBridgeMessage } from "@/lib/hooks/bridge/useRetryBridgeMessage";
import { useSafeContext } from "@/lib/hooks/bridge/useSafeContext";
import { getBridgeChain } from "../utils/constants.ts";
import { shortenAddress } from "@/lib/helpers.ts";
import type { Address } from "viem";
import { ExplorerLink } from "@/components/explorer-link.tsx";

const PAGE_SIZE = 20;

// Normalize LayerZero IDs to regular EVM chain IDs for UI rendering.
// Handles both legacy LZ IDs (e.g. 101) and v2 endpoint IDs (e.g. 30101).
const BRIDGE_CHAIN_ID_NORMALIZATION: Record<number, number> = {
  // Legacy LayerZero chain IDs
  101: 1, // Ethereum
  106: 43114, // Avalanche
  110: 42161, // Arbitrum
  184: 8453, // Base
  362: 80094, // Berachain
  // LayerZero v2 endpoint IDs
  30101: 1,
  30106: 43114,
  30110: 42161,
  30184: 8453,
  30362: 80094,
};

function normalizeBridgeChainId(chainId: number): number {
  return BRIDGE_CHAIN_ID_NORMALIZATION[chainId] ?? chainId;
}

const STATUS_BADGES: Record<
  BridgeStatus,
  { label: string; color: "green" | "blue" | "red" | "orange" }
> = {
  DELIVERED: { label: "Delivered", color: "green" },
  INFLIGHT: { label: "In Flight", color: "blue" },
  NEEDS_RETRY: { label: "Needs Retry", color: "orange" },
  NEEDS_RECOVERY: { label: "Needs Recovery", color: "orange" },
  AWAITING_SIGNATURES: { label: "Awaiting Signatures", color: "blue" },
  FAILED: { label: "Failed", color: "red" },
};

function RetryButton({ item }: { item: BridgeHistoryItem }) {
  const { retry, isPending } = useRetryBridgeMessage();
  const { isSafeApp } = useSafeContext(item.dstChainId);

  // The Safe App can't switch chain, and retrying is permissionless anyway.
  if (isSafeApp) {
    return (
      <span className="text-xs text-secondary-t">
        Any wallet can retry this on {getBridgeChain(item.dstChainId)?.name}
      </span>
    );
  }
  return (
    <Button size="xs" variant="secondary" disabled={isPending} onClick={() => retry(item)}>
      Retry
    </Button>
  );
}

function StatusCell({ item }: { item: BridgeHistoryItem }) {
  const { label, color } = STATUS_BADGES[item.status];
  const { safeProgress, note } = item;
  return (
    <div className="flex flex-col items-end gap-y-1">
      <div className="flex items-center justify-end gap-x-2">
        {item.status === "NEEDS_RETRY" && item.messageId && <RetryButton item={item} />}
        {safeProgress && (
          <span className="text-xs text-secondary-t">
            {safeProgress.confirmations} of {safeProgress.required}
          </span>
        )}
        <Badge variant="filled" color={color}>
          {label}
        </Badge>
        {safeProgress && (
          <a
            href={safeProgress.queueUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open Safe queue"
            className="text-tertiary-t hover:text-secondary-t transition-colors"
          >
            <RiExternalLinkLine size={16} />
          </a>
        )}
        {item.messageId && (
          <a
            href={getCcipExplorerUrl(item.messageId)}
            target="_blank"
            rel="noreferrer"
            aria-label="Track on CCIP Explorer"
            className="text-tertiary-t hover:text-secondary-t transition-colors"
          >
            <RiExternalLinkLine size={16} />
          </a>
        )}
      </div>
      {note && <span className="text-xs text-secondary-t">{note}</span>}
    </div>
  );
}

const columnHelper = createColumnHelper<BridgeHistoryItem>();

const columns = [
  columnHelper.accessor((row) => ({ srcChainId: row.srcChainId, dstChainId: row.dstChainId }), {
    id: "chain",
    header: "Chain",
    cell: ({ getValue }) => {
      const { srcChainId, dstChainId } = getValue();
      const srcChain = getBridgeChain(srcChainId);
      const dstChain = getBridgeChain(dstChainId);
      return (
        <div className="flex items-center">
          {srcChain && <ChainIcon chainId={srcChain.chainId} size={20} />}
          <RiArrowRightSLine size={16} className="text-tertiary-t" />
          {dstChain && <ChainIcon chainId={dstChain.chainId} size={20} />}
        </div>
      );
    },
  }),
  columnHelper.accessor("timestamp", {
    header: "Timestamp",
    cell: ({ getValue }) => {
      const ts = getValue();
      if (!ts) return <span className="text-secondary-t">—</span>;
      const date = new Date(ts);
      return (
        <div>
          <p className="text-xs/4 font-semibold text-primary-t">{format(date, "dd.MM.yyyy")}</p>
          <p className="text-xs/4 text-secondary-t font-normal">
            {format(date, "HH:mm")} GMT{format(date, "xxx")}
          </p>
        </div>
      );
    },
  }),
  columnHelper.accessor("amount", {
    header: "Amount",
    cell: ({ getValue }) => {
      const amount = getValue();
      if (amount === undefined) return <span className="text-secondary-t">—</span>;
      return (
        <div className="flex items-center gap-x-1">
          <Icon name="OHMTokenIcon" size={20} />
          <NumberFlow
            className="text-xs/4 font-semibold text-primary-t"
            value={Number(amount)}
            format={{ style: "decimal" }}
            suffix="OHM"
          />
        </div>
      );
    },
  }),
  columnHelper.accessor((row) => ({ hash: row.srcTxHash, chainId: row.srcChainId }), {
    id: "transactions",
    header: "Transactions",
    cell: ({ getValue }) => {
      const { hash, chainId } = getValue();
      if (!hash) return null;
      return (
        <ExplorerLink chainId={chainId} href={`/tx/${hash}`}>
          <div className="group flex items-center gap-x-1 text-xs/4 font-semibold text-primary-t">
            {shortenAddress(hash as Address, 3)}{" "}
            <RiExternalLinkLine
              size={16}
              className="text-tertiary-t group-hover:text-secondary-t transition-colors"
            />
          </div>
        </ExplorerLink>
      );
    },
  }),
  columnHelper.display({
    id: "status",
    header: () => <div className="text-right w-full">Status</div>,
    cell: ({ row }) => <StatusCell item={row.original} />,
  }),
];

export function BridgeHistory() {
  const { address } = useAccount();
  const { history, isLoading, error, partialError } = useBridgeHistory();

  const data = useMemo(
    () =>
      history.map((item) => ({
        ...item,
        srcChainId: normalizeBridgeChainId(item.srcChainId),
        dstChainId: normalizeBridgeChainId(item.dstChainId),
      })),
    [history],
  );

  const table = useReactTable({
    data,
    columns,
    // A Safe proposal has no tx hash until it executes.
    getRowId: (row) => `${row.srcTxHash || row.safeTxHash}-${row.srcChainId}`,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE, pageIndex: 0 } },
  });

  if (!address) {
    return (
      <Card className="flex items-center justify-center min-h-[240px]">
        <div className="flex flex-col items-center justify-center text-center py-16 px-8">
          <RiWalletFill className="text-surface-a10 mb-4" size={40} />
          <p className="text-sm/5 font-semibold text-secondary-t mb-1">
            Connect your wallet to view bridging history.
          </p>
          <p className="text-xs/4 font-normal text-secondary-t">
            Your OHM transfers between networks will appear here once completed.
          </p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center min-h-[240px]">
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <Spinner className="size-8" />
          <p className="text-sm/5 font-semibold text-secondary-t">Loading bridge history</p>
        </div>
      </Card>
    );
  }

  if (error && data.length === 0) {
    return (
      <Card className="flex items-center justify-center min-h-[240px]">
        <div className="flex flex-col items-center justify-center text-center py-16 px-8">
          <RiExchangeFill className="text-surface-a10 mb-4 rotate-90" size={40} />
          <p className="text-sm/5 font-semibold text-secondary-t mb-1">
            Couldn't load bridge history.
          </p>
          <p className="text-xs/4 font-normal text-secondary-t">
            This doesn't affect bridging. It'll try again shortly.
          </p>
        </div>
      </Card>
    );
  }

  if (data.length === 0 && !partialError) {
    return (
      <Card className="flex items-center justify-center min-h-[240px]">
        <div className="flex flex-col items-center justify-center text-center py-16 px-8">
          <RiExchangeFill className="text-surface-a10 mb-4 rotate-90" size={40} />
          <p className="text-sm/5 font-semibold text-secondary-t mb-1">No bridging activity yet.</p>
          <p className="text-xs/4 font-normal text-secondary-t">
            Your OHM transfers between networks will appear here once completed.
          </p>
        </div>
      </Card>
    );
  }

  const { pageIndex } = table.getState().pagination;
  const totalItems = data.length;
  const from = pageIndex * PAGE_SIZE + 1;
  const to = Math.min((pageIndex + 1) * PAGE_SIZE, totalItems);

  return (
    <div className="space-y-4">
      {(partialError || error) && (
        <Alert variant="compact" type="warning" size="sm" className="w-full">
          <RiInformationLine size={16} />
          <AlertDescription className="text-xs font-semibold text-primary-t">
            Some bridge history couldn't be loaded. It'll try again shortly.
          </AlertDescription>
        </Alert>
      )}
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
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-xs text-secondary-t">
          <span>
            Showing {from}–{to} out of {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="xs"
              variant="tertiary"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="xs"
              variant="tertiary"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
