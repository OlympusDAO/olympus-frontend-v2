import { useState, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowData,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiMoreFill, RiArrowRightSLine } from "@remixicon/react";
import { ConvertToOHMModal } from "@/components/convert-to-ohm-modal";
import { WrapPositionModal } from "@/components/wrap-position-modal";
import { TransferPositionModal } from "@/components/transfer-position-modal";
import { RedeemPositionModal } from "@/components/redeem-position-modal";
import { useUserPositions } from "@/lib/hooks/cds/useUserPositions";
import { formatEther } from "viem";
import { formatTermSuffix } from "@/lib/utils";
import { useReceiptTokenId, useReceiptTokenName } from "@/lib/hooks/cds/useReceiptToken";
import { Icon } from "@/components/icon";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { TokenName } from "@/lib/tokens.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Position = {
  id: bigint;
  data:
    | {
        operator: `0x${string}`;
        owner: `0x${string}`;
        asset: `0x${string}`;
        periodMonths: number;
        remainingDeposit: bigint;
        conversionPrice: bigint;
        expiry: number;
        wrapped: boolean;
        additionalData: `0x${string}`;
      }
    | undefined;
};

// ─── Table meta ───────────────────────────────────────────────────────────────

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    onConvert?: (position: Position) => void;
    onWrap?: (position: Position) => void;
    onUnwrap?: (position: Position) => void;
    onTransfer?: (position: Position, displayName: string) => void;
    onRedeem?: (position: Position) => void;
    ohmPrice?: number;
  }
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function formatPositionAmount(remainingDeposit: bigint) {
  return parseFloat(formatEther(remainingDeposit)).toFixed(2);
}

function formatExpiryDate(expiry: number) {
  return new Date(expiry * 1000).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDaysUntilExpiry(expiry: number) {
  const diffTime = new Date(expiry * 1000).getTime() - Date.now();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateOhmReceived(remainingDeposit: bigint, conversionPrice: bigint) {
  const ohmAmount = (remainingDeposit * BigInt(1e9)) / conversionPrice;
  return (Number(ohmAmount) / 1e9).toFixed(2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PositionTokenName = ({
  asset,
  periodMonths,
  amount,
}: {
  asset: `0x${string}`;
  periodMonths: number;
  amount: string;
}) => {
  const { tokenId } = useReceiptTokenId(asset, periodMonths);
  const { tokenName } = useReceiptTokenName(tokenId);
  const displayName = tokenName || `cdUSDS-${formatTermSuffix(periodMonths)}`;
  return (
    <span className="text-xs font-semibold">
      {amount} {displayName}
    </span>
  );
};

// ─── Cell components ──────────────────────────────────────────────────────────

const ConvertibleCell = ({ position, ohmPrice }: { position: Position; ohmPrice: number }) => {
  if (!position.data) return null;
  const amount = formatPositionAmount(position.data.remainingDeposit);
  const ohmReceived = calculateOhmReceived(
    position.data.remainingDeposit,
    position.data.conversionPrice,
  );

  return (
    <div className="flex items-center gap-1">
      {/* cdUSDS pill */}
      <div className="border border-a10-b rounded-full pl-[6px] pr-4 py-[6px] flex items-center gap-2 shrink-0">
        <Icon name="cdUSDSIcon" size={32} className="text-a10-b" />
        <div className="flex flex-col">
          <PositionTokenName
            asset={position.data.asset}
            periodMonths={position.data.periodMonths}
            amount={amount}
          />
          <span className="text-xs text-secondary-t">${amount}</span>
        </div>
      </div>

      <RiArrowRightSLine className="size-4 text-secondary-t shrink-0" />

      {/* OHM pill */}
      <div className="border border-a10-b rounded-full pl-[6px] pr-4 py-[6px] flex items-center gap-2 shrink-0">
        <Icon name="OHMColorTokenIcon" size={32} className="text-a10-b" />
        <div className="flex flex-col">
          <span className="text-xs font-semibold">{ohmReceived} OHM</span>
          {ohmPrice && <span className="text-xs text-secondary-t">{ohmPrice}</span>}
        </div>
      </div>
    </div>
  );
};

const StatusCell = ({ position }: { position: Position }) => {
  if (!position.data) return null;
  return (
    <div className="flex flex-col gap-1">
      <Badge variant="filled" color="green" size="sm">
        Convertible
      </Badge>
      {position.data.wrapped && (
        <Badge variant="filled" color="purple" size="sm">
          NFT
        </Badge>
      )}
    </div>
  );
};

const PriceCell = ({ position }: { position: Position }) => {
  if (!position.data) return null;
  const price = parseFloat(formatEther(position.data.conversionPrice)).toFixed();
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold whitespace-nowrap">{price} USDS/OHM</span>
      <span className="text-xs text-secondary-t">${price}</span>
    </div>
  );
};

const ExpiryCell = ({ position }: { position: Position }) => {
  if (!position.data) return null;
  const expiryDate = formatExpiryDate(position.data.expiry);
  const daysLeft = getDaysUntilExpiry(position.data.expiry);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold whitespace-nowrap">{expiryDate}</span>
      <span className="text-xs text-secondary-t">
        {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
      </span>
    </div>
  );
};

const ActionsCell = ({
  position,
  meta,
}: {
  position: Position;
  meta: ReturnType<typeof useReactTable<Position>>["options"]["meta"];
}) => {
  if (!position.data || !meta) return null;

  return (
    <div className="flex items-center gap-2 justify-end">
      <Button size="sm" onClick={() => meta.onConvert?.(position)}>
        Convert
      </Button>

      {!position.data.wrapped ? (
        <Button size="sm" variant="secondary" onClick={() => meta.onWrap?.(position)}>
          Wrap
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="sm" variant="secondary" className="w-8 h-8 p-0" />}
          >
            <RiMoreFill className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => meta.onUnwrap?.(position)}>Unwrap</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const displayName = `cdUSDS-${formatTermSuffix(position.data!.periodMonths)}`;
                meta.onTransfer?.(position, displayName);
              }}
            >
              Transfer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => meta.onRedeem?.(position)}>Redeem</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

// ─── Column definitions ───────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Position>();

// ─── Main component ───────────────────────────────────────────────────────────

export const DepositActivePositions = () => {
  const OHMToken = useToken(TokenName.OHM);
  const ohmPrice = OHMToken.price;
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isWrapModalOpen, setIsWrapModalOpen] = useState(false);
  const [wrapModalMode, setWrapModalMode] = useState<"wrap" | "unwrap">("wrap");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);

  const [selectedConvertPosition, setSelectedConvertPosition] = useState<{
    id: bigint;
    data: {
      remainingDeposit: bigint;
      conversionPrice: bigint;
      periodMonths: number;
      expiry: bigint;
      asset: `0x${string}`;
    };
  } | null>(null);

  const [selectedPosition, setSelectedPosition] = useState<{
    id: bigint;
    data: {
      remainingDeposit: bigint;
      conversionPrice: bigint;
      periodMonths: number;
      expiry: bigint;
    };
  } | null>(null);

  const [selectedTransferPosition, setSelectedTransferPosition] = useState<{
    positionId: number;
    asset: string;
    periodMonths: number;
    remainingDeposit: bigint;
    conversionPrice: bigint;
    expiry: number;
    displayName: string;
  } | null>(null);

  const [selectedRedeemPosition, setSelectedRedeemPosition] = useState<Position | null>(null);

  const { positions, isLoading: isLoadingPositions, error: positionsError } = useUserPositions();

  const handleConvert = (position: Position) => {
    if (!position.data) return;
    setSelectedConvertPosition({
      id: position.id,
      data: {
        remainingDeposit: position.data.remainingDeposit,
        conversionPrice: position.data.conversionPrice,
        periodMonths: position.data.periodMonths,
        expiry: BigInt(position.data.expiry),
        asset: position.data.asset,
      },
    });
    setIsConvertModalOpen(true);
  };

  const handleWrap = (position: Position) => {
    if (!position.data) return;
    setSelectedPosition({
      id: position.id,
      data: {
        remainingDeposit: position.data.remainingDeposit,
        conversionPrice: position.data.conversionPrice,
        periodMonths: position.data.periodMonths,
        expiry: BigInt(position.data.expiry),
      },
    });
    setWrapModalMode("wrap");
    setIsWrapModalOpen(true);
  };

  const handleUnwrap = (position: Position) => {
    if (!position.data) return;
    setSelectedPosition({
      id: position.id,
      data: {
        remainingDeposit: position.data.remainingDeposit,
        conversionPrice: position.data.conversionPrice,
        periodMonths: position.data.periodMonths,
        expiry: BigInt(position.data.expiry),
      },
    });
    setWrapModalMode("unwrap");
    setIsWrapModalOpen(true);
  };

  const handleTransfer = (position: Position, displayName: string) => {
    if (!position.data) return;
    setSelectedTransferPosition({
      positionId: Number(position.id),
      asset: position.data.asset || "",
      periodMonths: position.data.periodMonths,
      remainingDeposit: position.data.remainingDeposit,
      conversionPrice: position.data.conversionPrice,
      expiry: Number(position.data.expiry),
      displayName,
    });
    setIsTransferModalOpen(true);
  };

  const handleRedeem = (position: Position) => {
    setSelectedRedeemPosition(position);
    setIsRedeemModalOpen(true);
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "convertible",
        header: "Convertible",
        cell: ({ row }) => <ConvertibleCell position={row.original} ohmPrice={ohmPrice} />,
      }),
      columnHelper.display({
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusCell position={row.original} />,
      }),
      columnHelper.display({
        id: "price",
        header: "Price",
        cell: ({ row }) => <PriceCell position={row.original} />,
      }),
      columnHelper.display({
        id: "expiry",
        header: "Conversion Expiry",
        cell: ({ row }) => <ExpiryCell position={row.original} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row, table }) => <ActionsCell position={row.original} meta={table.options.meta} />,
      }),
    ],
    [ohmPrice],
  );

  const table = useReactTable({
    data: positions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id.toString(),
    meta: {
      onConvert: handleConvert,
      onWrap: handleWrap,
      onUnwrap: handleUnwrap,
      onTransfer: handleTransfer,
      onRedeem: handleRedeem,
      ohmPrice,
    },
  });

  const formatPositionAmountLocal = (remainingDeposit: bigint) =>
    parseFloat(formatEther(remainingDeposit)).toFixed(2);

  return (
    <>
      <h2 className="text-xl font-semibold mb-3">Active Positions</h2>

      {isLoadingPositions || positionsError || positions.length === 0 ? (
        <div className="rounded-3xl overflow-hidden shadow-surface-level-2">
          <div className="bg-surface-a3 px-3 py-3 border-b border-a5-b">
            <span className="text-xs text-secondary-t font-normal">Active Positions</span>
          </div>
          <div className="p-8 text-center text-secondary-t text-sm">
            {isLoadingPositions
              ? "Loading positions..."
              : positionsError
                ? "Error loading positions"
                : "No active positions"}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="block md:hidden space-y-4">
            {positions.map((position) => {
              if (!position.data) return null;
              const amount = formatPositionAmountLocal(position.data.remainingDeposit);
              const expiryDate = formatExpiryDate(position.data.expiry);
              const daysLeft = getDaysUntilExpiry(position.data.expiry);
              const conversionPrice = parseFloat(
                formatEther(position.data.conversionPrice),
              ).toFixed(2);
              const ohmReceived = calculateOhmReceived(
                position.data.remainingDeposit,
                position.data.conversionPrice,
              );

              return (
                <div
                  key={position.id.toString()}
                  className="rounded-2xl border border-a5-b p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="cdUSDSIcon" size={32} className="text-a10-b" />
                    <div>
                      <div className="text-sm font-semibold">
                        {amount} cdUSDS-{formatTermSuffix(position.data.periodMonths)}
                      </div>
                      <div className="text-xs text-secondary-t">${amount}</div>
                    </div>
                    <RiArrowRightSLine className="size-4 text-secondary-t mx-1" />
                    <Icon name="OHMColorTokenIcon" size={32} className="text-a10-b" />
                    <div>
                      <div className="text-sm font-semibold">{ohmReceived} OHM</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-secondary-t text-xs">Status:</span>
                      <div className="mt-1 flex flex-col gap-1">
                        <Badge className="bg-green/20 text-green text-[10px] font-semibold rounded-full px-2 py-0.5 w-fit border-0">
                          Convertible
                        </Badge>
                        {position.data.wrapped && (
                          <Badge className="bg-purple/20 text-purple text-[10px] font-semibold rounded-full px-2 py-0.5 w-fit border-0">
                            NFT
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-secondary-t text-xs">Price:</span>
                      <div className="mt-1 text-xs font-semibold">{conversionPrice} USDS/OHM</div>
                    </div>
                    <div>
                      <span className="text-secondary-t text-xs">Expiry:</span>
                      <div className="mt-1 text-xs font-semibold">{expiryDate}</div>
                      <div className="text-xs text-secondary-t">
                        {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => handleConvert(position)}>
                      Convert
                    </Button>
                    {!position.data.wrapped ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleWrap(position)}
                      >
                        Wrap
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button size="sm" variant="secondary" className="w-9 h-9 p-0" />}
                        >
                          <RiMoreFill className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUnwrap(position)}>
                            Unwrap
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleTransfer(
                                position,
                                `cdUSDS-${formatTermSuffix(position.data!.periodMonths)}`,
                              )
                            }
                          >
                            Transfer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRedeem(position)}>
                            Redeem
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-3xl overflow-hidden shadow-surface-level-2">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-surface-a3 border-b border-a5-b">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={[
                          "px-3 py-3 text-xs text-secondary-t font-normal text-left whitespace-nowrap",
                          header.id === "convertible" && "w-[360px]",
                          header.id === "status" && "w-[136px]",
                          header.id === "price" && "w-[168px]",
                          header.id === "expiry" && "w-[128px]",
                          header.id === "actions" && "w-[184px] text-right",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-a5-b last:border-0 h-16">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={[
                          "px-3 py-3",
                          cell.column.id === "convertible" && "w-[360px]",
                          cell.column.id === "status" && "w-[136px]",
                          cell.column.id === "price" && "w-[168px]",
                          cell.column.id === "expiry" && "w-[128px]",
                          cell.column.id === "actions" && "w-[184px]",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isConvertModalOpen && selectedConvertPosition && (
        <ConvertToOHMModal
          isOpen={isConvertModalOpen}
          onClose={() => {
            setIsConvertModalOpen(false);
            setSelectedConvertPosition(null);
          }}
          position={selectedConvertPosition}
        />
      )}
      {isWrapModalOpen && selectedPosition && (
        <WrapPositionModal
          isOpen={isWrapModalOpen}
          onClose={() => {
            setIsWrapModalOpen(false);
            setSelectedPosition(null);
          }}
          position={selectedPosition}
          mode={wrapModalMode}
        />
      )}
      {isTransferModalOpen && selectedTransferPosition && (
        <TransferPositionModal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setSelectedTransferPosition(null);
          }}
          position={selectedTransferPosition}
        />
      )}
      {isRedeemModalOpen && selectedRedeemPosition && (
        <RedeemPositionModal
          isOpen={isRedeemModalOpen}
          onClose={() => {
            setIsRedeemModalOpen(false);
            setSelectedRedeemPosition(null);
          }}
          position={selectedRedeemPosition}
        />
      )}
    </>
  );
};
