import { useCallback, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { RiMoreFill } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/icon";
import { CancelLimitOrderModal } from "@/components/cancel-limit-order-modal";
import { useUserLimitOrders } from "@/lib/hooks/cds/useUserLimitOrders";
import { formatEther } from "viem";
import { formatMaxPrice } from "@/lib/utils/priceCalculations";
import { formatTermSuffix } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type LimitOrder = {
  id: bigint;
  data:
    | {
        owner: `0x${string}`;
        depositPeriod: number;
        active: boolean;
        depositBudget: bigint;
        incentiveBudget: bigint;
        depositSpent: bigint;
        incentiveSpent: bigint;
        maxPrice: bigint;
        minFillSize: bigint;
      }
    | undefined;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: bigint) {
  return parseFloat(formatEther(amount)).toFixed(2);
}

function getFillPercentage(depositSpent: bigint, depositBudget: bigint) {
  if (depositBudget === 0n) return 0;
  return Number((depositSpent * 100n) / depositBudget);
}

// ─── Cell components ──────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<LimitOrder>();

const OrderCell = ({ order }: { order: LimitOrder }) => {
  if (!order.data) return null;
  const fillPct = getFillPercentage(order.data.depositSpent, order.data.depositBudget);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="border border-a10-b rounded-full pl-[6px] pr-4 py-[6px] flex items-center gap-2 w-fit">
        <Icon name="cdUSDSIcon" size={32} className="text-a10-b shrink-0" />
        <div className="flex flex-col">
          <span className="text-xs font-semibold">
            {formatAmount(order.data.depositBudget)} cdUSDS-
            {formatTermSuffix(order.data.depositPeriod)}
          </span>
          <span className="text-xs font-normal text-secondary-t">
            {formatAmount(order.data.depositSpent)} / {formatAmount(order.data.depositBudget)}{" "}
            filled
          </span>
        </div>
      </div>
      <Progress value={fillPct} className="h-1 w-40" />
    </div>
  );
};

const PriceCell = ({ order }: { order: LimitOrder }) => {
  if (!order.data) return null;
  return (
    <span className="text-xs font-semibold">{formatMaxPrice(order.data.maxPrice)} USDS/OHM</span>
  );
};

const TermCell = ({ order }: { order: LimitOrder }) => {
  if (!order.data) return null;
  return (
    <span className="text-xs font-semibold">{formatTermSuffix(order.data.depositPeriod)}</span>
  );
};

const IncentiveCell = ({ order }: { order: LimitOrder }) => {
  if (!order.data) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold">{formatAmount(order.data.incentiveBudget)} USDS</span>
      <span className="text-xs font-normal text-secondary-t">
        {formatAmount(order.data.incentiveSpent)} spent
      </span>
    </div>
  );
};

const ActionsCell = ({
  order,
  onCancel,
}: {
  order: LimitOrder;
  onCancel: (order: LimitOrder) => void;
}) => {
  if (!order.data) return null;
  const isFilled = order.data.depositSpent >= order.data.depositBudget;
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="secondary" size="sm" className="w-8 h-8 p-0" disabled={isFilled} />
          }
        >
          <RiMoreFill size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onCancel(order)}>Cancel</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const DepositOpenLimitOrders = () => {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LimitOrder | null>(null);

  const { orders, isLoading, error } = useUserLimitOrders();

  const handleCancel = useCallback((order: LimitOrder) => {
    setSelectedOrder(order);
    setIsCancelModalOpen(true);
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "order",
        header: "Order",
        cell: ({ row }) => <OrderCell order={row.original} />,
      }),
      columnHelper.display({
        id: "price",
        header: "Max Price",
        cell: ({ row }) => <PriceCell order={row.original} />,
      }),
      columnHelper.display({
        id: "term",
        header: "Term",
        cell: ({ row }) => <TermCell order={row.original} />,
      }),
      columnHelper.display({
        id: "incentive",
        header: "Keeper Incentive",
        cell: ({ row }) => <IncentiveCell order={row.original} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => <ActionsCell order={row.original} onCancel={handleCancel} />,
      }),
    ],
    [handleCancel],
  );

  const table = useReactTable({
    data: orders ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id.toString(),
  });

  // ─── Loading / Error / Empty states ───────────────────────────────────────

  const stateMessage = isLoading
    ? "Loading orders..."
    : error
      ? "Error loading orders. Please try again."
      : !orders || orders.length === 0
        ? "No open limit orders"
        : null;

  if (stateMessage) {
    return (
      <>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="h-40 py-12 text-center align-middle text-sm/5 font-semibold text-secondary-t">
                {stateMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.id === "actions" ? "text-right" : ""}
                  >
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
                  <TableCell
                    key={cell.id}
                    className={cell.column.id === "actions" ? "text-right" : ""}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {(orders ?? []).map((order) => {
          if (!order.data) return null;
          const fillPct = getFillPercentage(order.data.depositSpent, order.data.depositBudget);
          const isFilled = order.data.depositSpent >= order.data.depositBudget;
          return (
            <div key={order.id.toString()} className="rounded-2xl border border-a5-b p-4 space-y-3">
              {/* Token pill */}
              <div className="border border-a10-b rounded-full pl-[6px] pr-4 py-[6px] flex items-center gap-2 w-fit">
                <Icon name="cdUSDSIcon" size={32} className="text-a10-b shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">
                    {formatAmount(order.data.depositBudget)} cdUSDS-
                    {formatTermSuffix(order.data.depositPeriod)}
                  </span>
                  <span className="text-xs font-normal text-secondary-t">
                    {formatAmount(order.data.depositSpent)} /{" "}
                    {formatAmount(order.data.depositBudget)} filled
                  </span>
                </div>
              </div>

              <Progress value={fillPct} className="h-1" />

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-secondary-t">Max Price</p>
                  <p className="font-semibold">{formatMaxPrice(order.data.maxPrice)} USDS/OHM</p>
                </div>
                <div>
                  <p className="text-secondary-t">Term</p>
                  <p className="font-semibold">{formatTermSuffix(order.data.depositPeriod)}</p>
                </div>
                <div>
                  <p className="text-secondary-t">Keeper Incentive</p>
                  <p className="font-semibold">{formatAmount(order.data.incentiveBudget)} USDS</p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => handleCancel(order)}
                disabled={isFilled}
              >
                Cancel
              </Button>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedOrder?.data && (
        <CancelLimitOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => {
            setIsCancelModalOpen(false);
            setSelectedOrder(null);
          }}
          orderId={selectedOrder.id}
          orderData={selectedOrder.data}
        />
      )}
    </>
  );
};
