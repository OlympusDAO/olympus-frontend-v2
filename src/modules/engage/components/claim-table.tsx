import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useAccount, useChainId } from "wagmi";
import { Icon } from "@/components/icon.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { useGETUserUserHistory, type LibChainId } from "@/generated/olympusUnits";

type EpochStatus = "earning" | "claim" | "claimed";

interface EpochRow {
  epoch: number;
  drachmas: number;
  incentives: number | null;
  rewardAssetSymbol: string | null;
  conversionPrice: number | null;
  conversionPeriod: string | null;
  status: EpochStatus;
}

const columnHelper = createColumnHelper<EpochRow>();

const columns = [
  columnHelper.accessor("epoch", {
    header: "Epoch",
    cell: (info) => (
      <span className="font-semibold text-primary-t text-[15px]/[20px]">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("drachmas", {
    header: "Drachmas",
    cell: (info) => (
      <div className="flex items-center gap-x-1.5">
        <Icon name="drachmaTokenIcon" className="size-5" />
        <NumberFlow
          value={info.getValue()}
          format={{ style: "decimal", notation: "standard" }}
          suffix="Drachmas"
          className="text-[15px]/[20px] font-semibold text-primary-t"
        />
      </div>
    ),
  }),
  columnHelper.accessor("incentives", {
    header: "Incentives",
    cell: (info) => {
      const value = info.getValue();
      const symbol = info.row.original.rewardAssetSymbol;
      if (value === null) return <span className="">-</span>;
      return (
        <div className="flex items-center gap-x-1.5">
          <Icon name="iOHMTokenIcon" className="size-5" />
          <NumberFlow
            value={value}
            format={{ style: "decimal", notation: "standard" }}
            suffix={symbol ?? "iOHM"}
            className="text-[15px]/[20px] font-semibold text-primary-t"
          />
        </div>
      );
    },
  }),
  columnHelper.accessor("conversionPrice", {
    header: "Conversion Price",
    cell: (info) => {
      const value = info.getValue();
      if (value === null) return <span className="">-</span>;
      return (
        <div className="flex items-center gap-x-1">
          <NumberFlow
            value={value}
            format={{
              style: "decimal",
              notation: "standard",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }}
            className="text-[15px]/[20px] font-semibold text-green"
          />
          <span className="ml-1 font-semibold">USDS/OHM</span>
        </div>
      );
    },
  }),
  columnHelper.accessor("conversionPeriod", {
    header: "Conversion Period",
    cell: (info) => {
      const value = info.getValue();
      if (value === null) return <span className="">-</span>;
      return <span className=" font-semibold">{value}</span>;
    },
  }),
  columnHelper.accessor("status", {
    header: "",
    cell: (info) => {
      const status = info.getValue();
      if (status === "earning") {
        return (
          <Button variant="secondary" size="md" disabled>
            Earning
          </Button>
        );
      }
      if (status === "claim") {
        return (
          <Button variant="default" size="md">
            Claim
          </Button>
        );
      }
      return (
        <Button variant="secondary" size="md" disabled>
          Claimed
        </Button>
      );
    },
  }),
];

function formatDateRange(startTs: number, endTs: number): string {
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt.format(new Date(startTs * 1000))} - ${fmt.format(new Date(endTs * 1000))}`;
}

export function ClaimTable() {
  const { address } = useAccount();
  const chainId = useChainId() as LibChainId;

  const { data: historyData } = useGETUserUserHistory(
    address ?? "",
    { chainId },
    { query: { enabled: !!address } },
  );

  const tableData = useMemo<EpochRow[]>(() => {
    const entries = historyData?.rewards.entries ?? [];
    return entries.map((entry) => {
      const hasMerkle = typeof entry.merkleLeaf === "string" && entry.merkleLeaf.length > 0;
      const rewardAmount = parseFloat(entry.rewardAmount);
      const status: EpochStatus = !hasMerkle ? "earning" : rewardAmount > 0 ? "claim" : "claimed";

      return {
        epoch: entry.epochNumber,
        drachmas: parseFloat(entry.totalUnits),
        incentives: hasMerkle && rewardAmount > 0 ? rewardAmount : null,
        rewardAssetSymbol: entry.rewardAssetSymbol,
        conversionPrice: null,
        conversionPeriod: entry.endDate ? formatDateRange(entry.startDate, entry.endDate) : null,
        status,
      };
    });
  }, [historyData]);

  const table = useReactTable({
    data: tableData,
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
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-40 py-12 text-center align-middle text-sm/5 font-semibold text-secondary-t"
            >
              No epochs yet. Start earning Drachmas by depositing in Convertible Deposits.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
