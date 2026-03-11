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

type ConvertStatus = "convert" | "converted";

interface ConvertRow {
  availableToConvert: number;
  conversionPrice: number;
  priceIsGood: boolean;
  discount: number | null;
  conversionPeriod: string;
  netValue: number;
  status: ConvertStatus;
}

const mockData: ConvertRow[] = [
  {
    availableToConvert: 35,
    conversionPrice: 18.99,
    priceIsGood: false,
    discount: null,
    conversionPeriod: "May 1, 2026 - Jun 1, 2026",
    netValue: -600,
    status: "convert",
  },
  {
    availableToConvert: 12,
    conversionPrice: 16.99,
    priceIsGood: true,
    discount: 13,
    conversionPeriod: "May 1, 2026 - Jun 1, 2026",
    netValue: 600,
    status: "converted",
  },
];

const columnHelper = createColumnHelper<ConvertRow>();

const columns = [
  columnHelper.accessor("availableToConvert", {
    header: "Available to Convert",
    cell: (info) => (
      <div className="flex items-center gap-x-1.5">
        <Icon name="iOHMTokenIcon" className="size-5" />
        <NumberFlow
          value={info.getValue()}
          format={{ style: "decimal", notation: "standard" }}
          suffix="iOHM"
          className="text-[15px]/[20px] font-semibold text-primary-t"
        />
      </div>
    ),
  }),
  columnHelper.accessor("conversionPrice", {
    header: "Conversion Price",
    cell: (info) => {
      const { conversionPrice, priceIsGood } = info.row.original;
      return (
        <div className="flex items-center gap-x-1">
          <NumberFlow
            value={conversionPrice}
            format={{
              style: "decimal",
              notation: "standard",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }}
            className={`text-[15px]/[20px] font-semibold ${priceIsGood ? "text-green" : "text-red"}`}
          />
          <span className="ml-1 font-semibold text-primary-t">USDS/OHM</span>
        </div>
      );
    },
  }),
  columnHelper.accessor("discount", {
    header: "Discount",
    cell: (info) => {
      const value = info.getValue();
      if (value === null) return <span className="text-secondary-t">-</span>;
      return <span className="text-[15px]/[20px] font-semibold text-green">{value}%</span>;
    },
  }),
  columnHelper.accessor("conversionPeriod", {
    header: "Conversion Period",
    cell: (info) => <span className="font-semibold text-primary-t">{info.getValue()}</span>,
  }),
  columnHelper.accessor("netValue", {
    header: "Net Value",
    cell: (info) => {
      const value = info.getValue();
      const isPositive = value >= 0;
      return (
        <NumberFlow
          value={Math.abs(value)}
          format={{ style: "currency", currency: "USD", notation: "standard" }}
          prefix={isPositive ? "+" : "-"}
          className={`text-[15px]/[20px] font-semibold ${isPositive ? "text-green" : "text-red"}`}
        />
      );
    },
  }),
  columnHelper.accessor("status", {
    header: "",
    cell: (info) => {
      const status = info.getValue();
      if (status === "convert") {
        return (
          <Button variant="default" size="md">
            Convert to OHM
          </Button>
        );
      }
      return (
        <Button variant="secondary" size="md" disabled>
          Converted
        </Button>
      );
    },
  }),
];

export function ConvertTable() {
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
