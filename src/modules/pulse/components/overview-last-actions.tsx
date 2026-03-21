import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { RiArrowRightSLine, RiArrowRightUpLine } from "@remixicon/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useActivityFeed, type ActivityItem } from "@/lib/hooks/liveness/useActivityFeed";
import { formatAddress } from "@/lib/liveness/formatters";
import { TYPE_CONFIG, PROTOCOL_BADGE } from "@/modules/pulse/utils/activity-config";
import { ExplorerLink } from "@/components/explorer-link";
import { Badge } from "@/components/ui/badge.tsx";

const MAINNET_CHAIN_ID = 1;

// ── Column helper ─────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<ActivityItem>();

const columns = [
  columnHelper.display({
    id: "protocol",
    cell: ({ row }) => {
      const config = TYPE_CONFIG[row.original.type];
      return (
        <Badge variant="filled" size="md" color={PROTOCOL_BADGE[config.protocol]}>
          {config.protocol}
        </Badge>
      );
    },
  }),
  columnHelper.display({
    id: "action",
    cell: ({ row }) => {
      const config = TYPE_CONFIG[row.original.type];
      return (
        <div className="flex items-center gap-x-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-a5 border border-a3-b text-secondary-t">
            {config.icon}
          </div>
          <span className="text-[15px]/[20px] font-semibold">{config.actionLabel}</span>
        </div>
      );
    },
  }),
  columnHelper.display({
    id: "description",
    cell: ({ row }) => {
      const item = row.original;
      const config = TYPE_CONFIG[item.type];
      return (
        <div className="min-w-0 flex-1">
          <p className="text-[15px]/[20px] font-semibold">
            {item.address ? (
              <span className="">{formatAddress(item.address)}</span>
            ) : (
              <span className="">Protocol</span>
            )}{" "}
            <span className="text-secondary-t">{config.verb}</span>{" "}
            <span className="">{item.primaryValue}</span>
          </p>
          <p className="text-xs text-tertiary-t">{item.secondaryValue}</p>
        </div>
      );
    },
  }),
  columnHelper.display({
    id: "time",
    cell: ({ row }) => {
      const item = row.original;
      const txLink = item.txHash
        ? `/tx/${item.txHash}`
        : item.address
          ? `/address/${item.address}`
          : null;

      const timeText = (
        <span className="whitespace-nowrap text-sm tabular-nums text-tertiary-t">
          {formatDistanceToNow(item.timestamp * 1000, { addSuffix: true })}
        </span>
      );

      if (!txLink) return timeText;

      return (
        <ExplorerLink
          chainId={MAINNET_CHAIN_ID}
          href={txLink}
          className="flex items-center gap-x-1 text-[15px]/[20px] text-secondary-t"
        >
          {timeText}
          <RiArrowRightUpLine size={16} />
        </ExplorerLink>
      );
    },
  }),
];

// ── Component ─────────────────────────────────────────────────────────────────

export function OverviewLastActions() {
  const { data: allItems, isLoading } = useActivityFeed();

  const top5 = useMemo(() => (allItems ?? []).slice(0, 5), [allItems]);

  const table = useReactTable({
    data: top5,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Separator />
        <table className="w-full">
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-6 w-14 rounded-md" />
                </TableCell>
                <TableCell>
                  <Skeleton className="size-8 rounded-full" />
                </TableCell>
                <TableCell className="w-full">
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-14" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-[15px]/[20px] font-semibold">Last Protocol Actions</p>
        <Button variant="secondary" size="md" render={<Link to="/home/feed" />}>
          View All
          <RiArrowRightSLine />
        </Button>
      </div>
      <Separator />

      {/* Table */}
      {table.getRowModel().rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-tertiary-t">No recent activity</p>
      ) : (
        <table className="w-full">
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const cells = row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cell.column.id === "description" ? "w-full" : ""}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ));

              return <TableRow key={row.id}>{cells}</TableRow>;
            })}
          </TableBody>
        </table>
      )}
    </Card>
  );
}
