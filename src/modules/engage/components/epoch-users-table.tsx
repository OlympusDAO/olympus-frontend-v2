import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ExternalLinkIcon } from "lucide-react";
import type { Address } from "viem";
import { shortenAddress } from "@/lib/helpers";
import { Icon } from "@/components/icon";
import { NumberFlow } from "@/components/ui/number-flow";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EpochsEpochRewardUser } from "@/generated/olympusUnits";

const columnHelper = createColumnHelper<EpochsEpochRewardUser>();

interface EpochUsersTableProps {
  users: EpochsEpochRewardUser[];
  rewardAssetDecimals?: number;
}

export function EpochUsersTable({ users, rewardAssetDecimals = 9 }: EpochUsersTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("userAddress", {
        header: "User",
        cell: (info) => {
          const address = info.getValue();
          return (
            <a
              href={`https://etherscan.io/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary-t font-semibold hover:underline"
            >
              {shortenAddress(address as Address)}
              <ExternalLinkIcon className="size-3.5 text-secondary-t" />
            </a>
          );
        },
      }),
      columnHelper.accessor("units", {
        header: "Drachmas",
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <Icon name="drachmaTokenIcon" className="size-5" />
            <NumberFlow
              value={parseFloat(info.getValue())}
              format={{ style: "decimal", notation: "standard" }}
              className="text-[15px]/[20px] font-semibold text-primary-t"
            />
          </div>
        ),
      }),
      columnHelper.accessor("rewardAmount", {
        header: "Incentives",
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <Icon name="iOHMTokenIcon" className="size-5" />
            <NumberFlow
              value={parseFloat(info.getValue()) / 10 ** rewardAssetDecimals}
              format={{ style: "decimal", notation: "compact", maximumFractionDigits: 2 }}
              className="text-[15px]/[20px] font-semibold text-primary-t"
            />
          </div>
        ),
      }),
      columnHelper.accessor("rewardShare", {
        header: "Share",
        cell: (info) => (
          <span className="text-[15px]/[20px] font-semibold text-primary-t">
            {(parseFloat(info.getValue()) * 100).toFixed(2)}%
          </span>
        ),
      }),
      columnHelper.accessor("merkleLeaf", {
        header: "Merkle Leaf",
        cell: (info) => {
          const leaf = info.getValue();
          if (!leaf || typeof leaf !== "string") {
            return <span className="text-secondary-t text-[13px]/[18px]">—</span>;
          }
          const truncated = `${leaf.slice(0, 10)}…${leaf.slice(-8)}`;
          return <span className="font-mono text-[13px]/[18px] text-secondary-t">{truncated}</span>;
        },
      }),
    ],
    [rewardAssetDecimals],
  );

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-12 text-center text-secondary-t">
              No user data for this epoch.
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
