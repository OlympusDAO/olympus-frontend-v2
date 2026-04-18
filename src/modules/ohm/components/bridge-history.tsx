import { useMemo } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  RiExchangeFill,
  RiWalletFill,
  RiArrowRightSLine,
  RiExternalLinkLine,
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
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table.tsx";
import { useBridgeHistory, type BridgeHistoryItem } from "@/lib/hooks/bridge/useBridgeHistory.ts";
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
          <p className="text-sm font-semibold">{format(date, "dd.MM.yyyy")}</p>
          <p className="text-xs text-tertiary-t font-normal">
            {format(date, "HH:mm")} GMT{format(date, "xxx")}
          </p>
        </div>
      );
    },
  }),
  columnHelper.accessor("amount", {
    header: "Amount",
    cell: ({ getValue }) => (
      <div className="flex items-center gap-x-1">
        <Icon name="OHMColorTokenIcon" size={20} />
        <NumberFlow
          className="text-xs font-semibold"
          value={Number(getValue())}
          format={{ style: "decimal" }}
          suffix="OHM"
        />
      </div>
    ),
  }),
  columnHelper.accessor((row) => ({ hash: row.srcTxHash, chainId: row.srcChainId }), {
    id: "transactions",
    header: "Transactions",
    cell: ({ getValue }) => {
      const { hash, chainId } = getValue();
      if (!hash) return null;
      return (
        <ExplorerLink chainId={chainId} href={`/tx/${hash}`}>
          <div className="flex items-center gap-x-1">
            {shortenAddress(hash as Address, 3)} <RiExternalLinkLine size={16} />
          </div>
        </ExplorerLink>
      );
    },
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => {
      const isDelivered = getValue() === "DELIVERED";
      const isInflight = getValue() === "INFLIGHT";

      return (
        <Badge variant="filled" color={isDelivered ? "green" : isInflight ? "blue" : "red"}>
          {isDelivered ? "Delivered" : isInflight ? "In Flight" : getValue()}
        </Badge>
      );
    },
  }),
];

export function BridgeHistory() {
  const { address } = useAccount();
  const { history, isLoading } = useBridgeHistory();

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
    getRowId: (row) => `${row.srcTxHash}-${row.srcChainId}`,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE, pageIndex: 0 } },
  });

  if (!address) {
    return (
      <Card className="flex items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center py-16 px-8">
          <RiWalletFill className="text-surface-a10 mb-4" size={40} />
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

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center">
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-secondary-t">Loading bridge history...</p>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="flex items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center py-16 px-8">
          <RiExchangeFill className="text-surface-a10 mb-4 rotate-90" size={40} />
          <p className="text-sm font-medium text-primary-t mb-1">No bridging activity yet.</p>
          <p className="text-xs text-tertiary-t">
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
