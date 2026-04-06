import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowData,
} from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    userAddress?: `0x${string}` | undefined;
  }
}
import { ArrowUpIcon, ArrowDownIcon, ExternalLinkIcon } from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import type { Address } from "viem";
import { shortenAddress } from "@/lib/helpers.ts";
import { Icon } from "@/components/icon.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  useGETSeasonsLeaderboard,
  type LibChainId,
  type SeasonsLeaderboardEntry,
  type SeasonsPositionDirection,
} from "@/generated/olympusUnits";

interface LeaderboardRow {
  rank: number;
  address: string;
  totalDrachmas: number;
  positionChange: number;
  positionDirection: SeasonsPositionDirection;
}

const MEDAL_ICONS = {
  1: "medalLine1Icon",
  2: "medalLine2Icon",
  3: "medalLine3Icon",
} as const;

const columnHelper = createColumnHelper<LeaderboardRow>();

export function LeaderboardTable() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId() as LibChainId;

  const { data: leaderboardData } = useGETSeasonsLeaderboard({ chainId, limit: 100 });

  const tableData = useMemo<LeaderboardRow[]>(
    () =>
      (leaderboardData?.entries ?? []).map((entry: SeasonsLeaderboardEntry) => ({
        rank: entry.rank,
        address: entry.address,
        totalDrachmas: parseFloat(entry.totalUnits),
        positionChange: entry.positionChange,
        positionDirection: entry.positionDirection,
      })),
    [leaderboardData],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("rank", {
        size: 64,
        header: () => <span className="block text-center">Rank</span>,
        cell: (info) => {
          const rank = info.getValue();
          const medalIcon = MEDAL_ICONS[rank as keyof typeof MEDAL_ICONS];
          if (medalIcon) {
            return (
              <div className="flex justify-center">
                <Icon name={medalIcon} className="size-8" />
              </div>
            );
          }
          return (
            <span className="block text-center font-semibold text-primary-t text-[15px]/[20px]">
              {rank}
            </span>
          );
        },
      }),
      columnHelper.accessor("address", {
        header: "Address",
        cell: (info) => {
          const address = info.getValue();
          const isCurrentUser =
            userAddress !== undefined && address.toLowerCase() === userAddress.toLowerCase();
          return (
            <div className="flex items-center gap-x-2">
              <a
                href={`https://etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-x-1 text-primary-t font-semibold hover:underline"
              >
                {shortenAddress(address as Address)}
                <ExternalLinkIcon className="size-3.5 text-secondary-t" />
              </a>
              {isCurrentUser && (
                <Badge variant="ghost" color="gray" size="sm">
                  YOU
                </Badge>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("totalDrachmas", {
        header: "Total Drachmas",
        cell: (info) => (
          <div className="flex items-center gap-x-1.5">
            <Icon name="drachmaTokenIcon" className="size-5" />
            <NumberFlow
              value={info.getValue()}
              format={{ style: "decimal", notation: "standard" }}
              className="text-[15px]/[20px] font-semibold text-primary-t"
            />
          </div>
        ),
      }),
      columnHelper.accessor("positionChange", {
        header: "1D Change",
        cell: (info) => {
          const direction = info.row.original.positionDirection;
          if (direction === "none" || direction === "new") {
            return <span className="text-secondary-t">—</span>;
          }
          const isUp = direction === "up";
          return (
            <div className={`flex items-center gap-x-1 ${isUp ? "text-green" : "text-red"}`}>
              {isUp ? <ArrowUpIcon className="size-3.5" /> : <ArrowDownIcon className="size-3.5" />}
              <NumberFlow
                value={info.getValue()}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[15px]/[20px] font-semibold"
              />
            </div>
          );
        },
      }),
    ],
    [userAddress],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: { userAddress },
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                style={{
                  width: header.column.getSize() !== 150 ? header.column.getSize() : undefined,
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => {
          const rowAddress = row.original.address;
          const isCurrentUser =
            userAddress !== undefined && rowAddress.toLowerCase() === userAddress.toLowerCase();
          return (
            <TableRow key={row.id} className={isCurrentUser ? "bg-blue/10 hover:bg-blue/10" : ""}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={{
                    width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined,
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
