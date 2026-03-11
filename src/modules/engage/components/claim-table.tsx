import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
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

type EpochStatus = "earning" | "claim" | "claimed";

interface EpochRow {
  epoch: number;
  drachmas: number;
  incentives: number | null;
  conversionPrice: number | null;
  conversionPeriod: string | null;
  status: EpochStatus;
}

const mockData: EpochRow[] = [
  {
    epoch: 5,
    drachmas: 8357,
    incentives: null,
    conversionPrice: null,
    conversionPeriod: null,
    status: "earning",
  },
  {
    epoch: 4,
    drachmas: 9573,
    incentives: 42,
    conversionPrice: 16.01,
    conversionPeriod: null,
    status: "claim",
  },
  {
    epoch: 3,
    drachmas: 6482,
    incentives: 18,
    conversionPrice: 16.04,
    conversionPeriod: "May 1, 2026 - Jun 1, 2026",
    status: "claimed",
  },
];

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
      if (value === null) return <span className="">-</span>;
      return (
        <div className="flex items-center gap-x-1.5">
          <Icon name="iOHMTokenIcon" className="size-5" />
          <NumberFlow
            value={value}
            format={{ style: "decimal", notation: "standard" }}
            suffix="iOHM"
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

export function ClaimTable() {
  const table = useReactTable({
    data: mockData,
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
  );
}
