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
import { Spinner } from "@/components/spinner.tsx";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table.tsx";
import { useBridgeHistory, type BridgeHistoryItem } from "@/lib/hooks/bridge/useBridgeHistory.ts";
import { getBridgeChain, getLayerZeroScanTxUrl } from "../utils/constants.ts";
import { shortenAddress } from "@/lib/helpers.ts";
import type { Address } from "viem";
import { ExplorerLink } from "@/components/explorer-link.tsx";

const PAGE_SIZE = 20;

const columnHelper = createColumnHelper<BridgeHistoryItem>();

// Map a bridge status to its badge label + color.
function statusBadge(status: string): {
  label: string;
  color: "green" | "blue" | "orange" | "red";
} {
  switch (status) {
    case "DELIVERED":
      return { label: "Delivered", color: "green" };
    case "INFLIGHT":
      return { label: "In Flight", color: "blue" };
    case "PENDING_RECOVERY":
      return { label: "Pending Recovery", color: "orange" };
    default:
      return { label: "Failed", color: "red" };
  }
}

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
    cell: ({ getValue }) => (
      <div className="flex items-center gap-x-1">
        <Icon name="OHMTokenIcon" size={20} />
        <NumberFlow
          className="text-xs/4 font-semibold text-primary-t"
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
        <div className="flex flex-col gap-y-1">
          <ExplorerLink chainId={chainId} href={`/tx/${hash}`}>
            <div className="group flex items-center gap-x-1 text-xs/4 font-semibold text-primary-t">
              {shortenAddress(hash as Address, 3)}{" "}
              <RiExternalLinkLine
                size={16}
                className="text-tertiary-t group-hover:text-secondary-t transition-colors"
              />
            </div>
          </ExplorerLink>
          <a
            href={getLayerZeroScanTxUrl(hash)}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-x-1 text-xs/4 font-normal text-secondary-t hover:text-primary-t transition-colors"
          >
            LZ Scan
            <RiExternalLinkLine
              size={14}
              className="text-tertiary-t group-hover:text-secondary-t transition-colors"
            />
          </a>
        </div>
      );
    },
  }),
  columnHelper.accessor("status", {
    header: () => <div className="text-right w-full">Status</div>,
    cell: ({ getValue }) => {
      const { label, color } = statusBadge(getValue());
      return (
        <div className="flex justify-end">
          <Badge variant="filled" color={color}>
            {label}
          </Badge>
        </div>
      );
    },
  }),
];

export function BridgeHistory() {
  const { address } = useAccount();
  const { history, isLoading } = useBridgeHistory();

  // History already returns EVM chain IDs (EIDs resolved in the hook).
  const data = useMemo(() => history, [history]);

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

  if (data.length === 0) {
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
