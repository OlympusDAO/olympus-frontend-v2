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
import type { MockUser } from "./rewards-manager-mock";

const MOCK_USERS: MockUser[] = [
  {
    address: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    drachmas: 12450,
    incentives: 312.5,
    share: "18.92%",
    merkleLeaf: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  {
    address: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
    drachmas: 9820,
    incentives: 245.5,
    share: "14.93%",
    merkleLeaf: "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
  },
  {
    address: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    drachmas: 8100,
    incentives: 202.5,
    share: "12.31%",
    merkleLeaf: "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
  },
  {
    address: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
    drachmas: 6540,
    incentives: 163.5,
    share: "9.94%",
    merkleLeaf: "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
  },
  {
    address: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
    drachmas: 5200,
    incentives: 130.0,
    share: "7.90%",
    merkleLeaf: "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
  },
  {
    address: "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a",
    drachmas: 4380,
    incentives: 109.5,
    share: "6.66%",
    merkleLeaf: "0xf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
  },
  {
    address: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
    drachmas: 3610,
    incentives: 90.25,
    share: "5.49%",
    merkleLeaf: "0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
  },
  {
    address: "0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c",
    drachmas: 2940,
    incentives: 73.5,
    share: "4.47%",
    merkleLeaf: "0xb8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
  },
  {
    address: "0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
    drachmas: 2270,
    incentives: 56.75,
    share: "3.45%",
    merkleLeaf: "0xc9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
  },
  {
    address: "0x0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e",
    drachmas: 1850,
    incentives: 46.25,
    share: "2.81%",
    merkleLeaf: "0xd0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
  },
];

const columnHelper = createColumnHelper<MockUser>();

interface EpochUsersTableProps {
  users?: MockUser[];
}

export function EpochUsersTable({ users = MOCK_USERS }: EpochUsersTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("address", {
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
      columnHelper.accessor("drachmas", {
        header: "Drachmas",
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <Icon name="drachmaTokenIcon" className="size-5" />
            <NumberFlow
              value={info.getValue()}
              format={{ style: "decimal", notation: "standard" }}
              className="text-[15px]/[20px] font-semibold text-primary-t"
            />
          </div>
        ),
      }),
      columnHelper.accessor("incentives", {
        header: "Incentives",
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <Icon name="iOHMTokenIcon" className="size-5" />
            <NumberFlow
              value={info.getValue()}
              format={{ style: "decimal", notation: "compact", maximumFractionDigits: 2 }}
              className="text-[15px]/[20px] font-semibold text-primary-t"
            />
          </div>
        ),
      }),
      columnHelper.accessor("share", {
        header: "Share",
        cell: (info) => (
          <span className="text-[15px]/[20px] font-semibold text-primary-t">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("merkleLeaf", {
        header: "Merkle Leaf",
        cell: (info) => {
          const hash = info.getValue();
          const truncated = `${hash.slice(0, 10)}…${hash.slice(-8)}`;
          return <span className="font-mono text-[13px]/[18px] text-secondary-t">{truncated}</span>;
        },
      }),
    ],
    [],
  );

  const data = users && users.length > 0 ? users : MOCK_USERS;

  const table = useReactTable({
    data,
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
