import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpIcon, ArrowDownIcon, ExternalLinkIcon } from "lucide-react";
import { useAccount } from "wagmi";
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

interface LeaderboardRow {
  rank: number;
  address: string;
  totalDrachmas: number;
  change1d: number | null;
}

const mockData: LeaderboardRow[] = [
  {
    rank: 256,
    address: "0xD0cB941dDA71ccd5f4C48462ba0975083585Fecf",
    totalDrachmas: 245,
    change1d: 9,
  },
  {
    rank: 1,
    address: "0xA3fB45345b8CAf794CaB9e2aF7d5C4bB012F8eD1",
    totalDrachmas: 14567,
    change1d: 2,
  },
  {
    rank: 2,
    address: "0x7cDa19B3F4e6081C2290f3e8bA6d9E1234567890",
    totalDrachmas: 12478,
    change1d: -4,
  },
  {
    rank: 3,
    address: "0xF1e2D3c4B5a6978899aAbBcCdDeEfF0011223344",
    totalDrachmas: 8455,
    change1d: 5,
  },
  {
    rank: 4,
    address: "0x2b3C4d5E6f7A8B9C0d1E2F3a4B5c6D7e8F9a0B1",
    totalDrachmas: 2424,
    change1d: 1,
  },
  {
    rank: 5,
    address: "0x9E8d7C6b5A4f3E2d1C0b9A8f7E6d5C4b3A2f1E0",
    totalDrachmas: 2425,
    change1d: null,
  },
  {
    rank: 6,
    address: "0x1a2B3c4D5e6F7a8B9c0D1e2F3A4b5C6d7E8f9A0",
    totalDrachmas: 2426,
    change1d: 1,
  },
];

const MEDAL_ICONS = {
  1: "medalLine1Icon",
  2: "medalLine2Icon",
  3: "medalLine3Icon",
} as const;

const columnHelper = createColumnHelper<LeaderboardRow>();

export function LeaderboardTable() {
  const { address: userAddress } = useAccount();

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
      columnHelper.accessor("change1d", {
        header: "1D Change",
        cell: (info) => {
          const value = info.getValue();
          if (value === null) return <span className="text-secondary-t">—</span>;
          const isPositive = value >= 0;
          return (
            <div className={`flex items-center gap-x-1 ${isPositive ? "text-green" : "text-red"}`}>
              {isPositive ? (
                <ArrowUpIcon className="size-3.5" />
              ) : (
                <ArrowDownIcon className="size-3.5" />
              )}
              <NumberFlow
                value={Math.abs(value)}
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
    data: mockData,
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
