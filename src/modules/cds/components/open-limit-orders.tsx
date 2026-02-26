import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { CancelLimitOrderModal } from "@/components/cancel-limit-order-modal";
import { useUserLimitOrders } from "@/lib/hooks/cds/useUserLimitOrders";
import { formatEther } from "viem";
import { formatMaxPrice } from "@/lib/utils/priceCalculations";
import { formatTermSuffix } from "@/lib/utils";
import cdUSDSIcon from "@/assets/cdUSDS.png";

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

export const OpenLimitOrders = () => {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LimitOrder | null>(null);

  // Get user's limit orders
  const {
    orders,
    isLoading: isLoadingOrders,
    error: ordersError,
  } = useUserLimitOrders();

  // Helper function to format amounts
  const formatAmount = (amount: bigint) => {
    return parseFloat(formatEther(amount)).toFixed(2);
  };

  // Calculate fill percentage
  const getFillPercentage = (depositSpent: bigint, depositBudget: bigint) => {
    if (depositBudget === 0n) return 0;
    return Number((depositSpent * 100n) / depositBudget);
  };

  // Get status badge with consistent styling
  const getStatusBadge = (depositSpent: bigint, depositBudget: bigint) => {
    const fillPercentage = getFillPercentage(depositSpent, depositBudget);

    if (fillPercentage === 0) {
      return (
        <Badge className="bg-blue/20 text-blue rounded-full px-3 py-1 w-fit">
          Active
        </Badge>
      );
    } else if (fillPercentage < 100) {
      return (
        <Badge className="bg-yellow/20 text-yellow rounded-full px-3 py-1 w-fit">
          Partially Filled
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray/20 text-gray rounded-full px-3 py-1 w-fit">
          Filled
        </Badge>
      );
    }
  };

  // Handle cancel order
  const handleCancelOrder = (order: LimitOrder) => {
    setSelectedOrder(order);
    setIsCancelModalOpen(true);
  };

  if (isLoadingOrders) {
    return (
      <>
        <h2 className="text-xl font-semibold mb-3">Open Limit Orders</h2>
        <Card className="p-6">
          <div className="text-center py-8 text-secondary-t">
            Loading orders...
          </div>
        </Card>
      </>
    );
  }

  if (ordersError) {
    return (
      <>
        <h2 className="text-xl font-semibold mb-3">Open Limit Orders</h2>
        <Card className="p-6">
          <div className="text-center py-8 text-red-500">
            Error loading orders. Please try again.
          </div>
        </Card>
      </>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <>
        <h2 className="text-xl font-semibold mb-3">Open Limit Orders</h2>
        <Card className="p-6">
          <div className="text-center py-8 text-secondary-t">
            No open limit orders
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-3">Open Limit Orders</h2>
      <Card className="p-6 space-y-4">
        {/* Desktop Table View */}
        <Table className="hidden md:table">
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="border-b-0">
              <TableHead className="text-secondary-t font-normal">
                Order Details
              </TableHead>
              <TableHead className="text-secondary-t font-normal">
                Budget & Filled
              </TableHead>
              <TableHead className="text-secondary-t font-normal">
                Status
              </TableHead>
              <TableHead className="text-secondary-t font-normal text-end">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              if (!order.data) return null;

              const remaining = order.data.depositBudget - order.data.depositSpent;
              const fillPercentage = getFillPercentage(
                order.data.depositSpent,
                order.data.depositBudget
              );

              return (
                <TableRow key={order.id.toString()} className="border-b-0">
                  {/* Order Details */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3 border rounded-full p-[6px] border-a10-b pr-4 w-fit">
                      <img
                        src={cdUSDSIcon}
                        alt="Receipt Token"
                        className="w-8 h-8 shrink-0"
                      />
                      <div className="flex flex-col">
                        <div className="font-medium whitespace-nowrap">
                          {formatAmount(order.data.depositBudget)} cdUSDS-{formatTermSuffix(order.data.depositPeriod)}
                        </div>
                        <div className="text-sm text-secondary-t whitespace-nowrap">
                          {formatMaxPrice(order.data.maxPrice)} USDS/OHM
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Budget & Filled */}
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-secondary-t">Total:</span>
                        <span className="font-medium">
                          {formatAmount(order.data.depositBudget)} USDS
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-secondary-t">Filled:</span>
                        <span className="font-medium">
                          {formatAmount(order.data.depositSpent)} USDS
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-secondary-t">Remaining:</span>
                        <span className="font-medium">
                          {formatAmount(remaining)} USDS
                        </span>
                      </div>
                      <Progress value={fillPercentage} className="h-2" />
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(order.data.depositSpent, order.data.depositBudget)}
                      {fillPercentage > 0 && fillPercentage < 100 && (
                        <span className="text-xs text-secondary-t">
                          {fillPercentage.toFixed(0)}% filled
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell className="py-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() => handleCancelOrder(order)}
                      disabled={order.data.depositSpent === order.data.depositBudget}
                    >
                      Cancel
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {orders.map((order) => {
            if (!order.data) return null;

            const remaining = order.data.depositBudget - order.data.depositSpent;
            const fillPercentage = getFillPercentage(
              order.data.depositSpent,
              order.data.depositBudget
            );

            return (
              <Card key={order.id.toString()} className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src={cdUSDSIcon} alt="Receipt Token" className="w-8 h-8" />
                    <div>
                      <div className="font-medium">
                        {formatAmount(order.data.depositBudget)} cdUSDS-{formatTermSuffix(order.data.depositPeriod)}
                      </div>
                      <div className="text-sm text-secondary-t">
                        {formatMaxPrice(order.data.maxPrice)} USDS/OHM
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(order.data.depositSpent, order.data.depositBudget)}
                </div>

                {/* Budget Info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-t">Total:</span>
                    <span className="font-medium">
                      {formatAmount(order.data.depositBudget)} USDS
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-t">Filled:</span>
                    <span className="font-medium">
                      {formatAmount(order.data.depositSpent)} USDS
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-t">Remaining:</span>
                    <span className="font-medium">{formatAmount(remaining)} USDS</span>
                  </div>
                  <Progress value={fillPercentage} className="h-2" />
                  {fillPercentage > 0 && fillPercentage < 100 && (
                    <div className="text-xs text-secondary-t text-center">
                      {fillPercentage.toFixed(0)}% filled
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full rounded-full"
                    onClick={() => handleCancelOrder(order)}
                    disabled={order.data.depositSpent === order.data.depositBudget}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Modal */}
      {selectedOrder && (
        <CancelLimitOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => {
            setIsCancelModalOpen(false);
            setSelectedOrder(null);
          }}
          orderId={selectedOrder.id}
          orderData={selectedOrder.data!}
        />
      )}
    </>
  );
};
