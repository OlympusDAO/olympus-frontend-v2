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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiArrowRightSLine, RiMoreFill } from "@remixicon/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConvertToOHMModal } from "@/components/convert-to-ohm-modal";
import { WrapPositionModal } from "@/components/wrap-position-modal";
import { TransferPositionModal } from "@/components/transfer-position-modal";
import { RedeemPositionModal } from "@/components/redeem-position-modal";
import { useUserPositions, type UserPosition } from "@/lib/hooks/cds/useUserPositions";
import { formatEther } from "viem";
import { Icon, type IconName } from "@/components/icon";
import { Tooltip } from "@/components/ui/tooltip";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { TokenName } from "@/lib/tokens.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Position = UserPosition;

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

/** Threshold above which a figure is abbreviated. Below it, exact reads fine and fits. */
const COMPACT_FROM = 1_000_000;

function formatExact(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Abbreviates figures at or above a million (`2.96M`), exact below. The row has a
 * hard 1000px frame — the content column is capped, so it does not grow with the
 * viewport — and at full precision the row crosses that around 296M and scrolls.
 * Abbreviating makes the width independent of deposit size: 963px today, 923px at
 * billions. The exact figure is never lost, every pill carries it in a tooltip.
 */
function formatCompact(value: number) {
  if (Math.abs(value) < COMPACT_FROM) return formatExact(value);
  return value.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 });
}

function formatPositionAmount(remainingDeposit: bigint) {
  return formatExact(parseFloat(formatEther(remainingDeposit)));
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
  return Number(ohmAmount) / 1e9;
}

function formatUsd(value: number) {
  return `$${formatExact(value)}`;
}

function formatUsdCompact(value: number) {
  return `$${formatCompact(value)}`;
}

// ─── Cell components ──────────────────────────────────────────────────────────

/** Pill body: abbreviated figures on screen, the exact ones behind a tooltip. */
const AmountPill = ({
  icon,
  primary,
  secondary,
  exact,
}: {
  icon: IconName;
  primary: string;
  secondary: string;
  exact: React.ReactNode;
}) => (
  <div className="border border-a10-b rounded-full pl-[6px] pr-3 py-[6px] flex items-center gap-2 shrink-0">
    <Icon name={icon} size={32} className="text-a10-b" />
    <Tooltip title={exact}>
      <div className="flex flex-col cursor-default">
        <span className="text-xs font-semibold whitespace-nowrap">{primary}</span>
        <span className="text-xs font-normal text-secondary-t">{secondary}</span>
      </div>
    </Tooltip>
  </div>
);

const ConvertibleCell = ({ position, ohmPrice }: { position: Position; ohmPrice: number }) => {
  if (!position.data) return null;
  const deposit = parseFloat(formatEther(position.data.remainingDeposit));
  const ohmReceived = calculateOhmReceived(
    position.data.remainingDeposit,
    position.data.conversionPrice,
  );
  // The USD value of the OHM, mirroring the deposit pill. Rendering `ohmPrice`
  // raw put an unformatted unit price (`20.177940934581386`) under every row,
  // the same number on all of them, and ~90px of width the column cannot spare.
  const ohmUsd = ohmPrice > 0 ? ohmReceived * ohmPrice : null;

  return (
    <div className="flex items-center gap-1">
      <AmountPill
        icon="cdUSDSIcon"
        primary={`${formatCompact(deposit)} ${position.displayName}`}
        secondary={formatUsdCompact(deposit)}
        exact={`${formatExact(deposit)} ${position.displayName} (${formatUsd(deposit)})`}
      />

      <RiArrowRightSLine className="size-4 text-secondary-t shrink-0" />

      <AmountPill
        icon="OHMTokenIcon"
        primary={`${formatCompact(ohmReceived)} OHM`}
        secondary={ohmUsd !== null ? formatUsdCompact(ohmUsd) : ""}
        exact={
          ohmUsd !== null
            ? `${formatExact(ohmReceived)} OHM (${formatUsd(ohmUsd)})`
            : `${formatExact(ohmReceived)} OHM`
        }
      />
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
  const priceNum = parseFloat(formatEther(position.data.conversionPrice));
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold whitespace-nowrap">
        {priceNum.toFixed(2)} USDS/OHM
      </span>
      <span className="text-xs font-normal text-secondary-t">${priceNum.toFixed(2)}</span>
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
      <span className="text-xs font-normal text-secondary-t">
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
  const { wrapped } = position.data;

  // Convert and Redeem stay inline; the wrapping actions go behind the overflow
  // menu, the same shape Active Loans uses. Four inline buttons (which is what a
  // wrapped position rendered) took the row's intrinsic width to 1111px against
  // a frame that is capped at 1000px on every desktop size, so the table could
  // not fit no matter how wide the window was. This makes the column's width
  // constant instead of dependent on whether the position happens to be wrapped.
  return (
    <div className="flex items-center gap-2 justify-end">
      <Button size="sm" onClick={() => meta.onConvert?.(position)}>
        Convert
      </Button>
      <Button size="sm" variant="secondary" onClick={() => meta.onRedeem?.(position)}>
        Redeem
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="sm" variant="secondary" className="size-8 p-0" />}
        >
          <RiMoreFill className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {wrapped && (
            <DropdownMenuItem onClick={() => meta.onTransfer?.(position, position.displayName)}>
              Transfer
            </DropdownMenuItem>
          )}
          {wrapped ? (
            <DropdownMenuItem onClick={() => meta.onUnwrap?.(position)}>Unwrap</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => meta.onWrap?.(position)}>Wrap</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
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

  return (
    <>
      {isLoadingPositions || positionsError || positions.length === 0 ? (
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="h-40 py-12 text-center align-middle text-sm/5 font-semibold text-secondary-t">
                {isLoadingPositions
                  ? "Loading positions..."
                  : positionsError
                    ? "Error loading positions"
                    : "No active positions"}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="block md:hidden space-y-4">
            {positions.map((position) => {
              if (!position.data) return null;
              const amount = formatPositionAmount(position.data.remainingDeposit);
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
                        {amount} {position.displayName}
                      </div>
                      <div className="text-xs text-secondary-t">${amount}</div>
                    </div>
                    <RiArrowRightSLine className="size-4 text-secondary-t mx-1" />
                    <Icon name="OHMTokenIcon" size={32} className="text-a10-b" />
                    <div>
                      <div className="text-sm font-semibold">{formatExact(ohmReceived)} OHM</div>
                      {ohmPrice > 0 && (
                        <div className="text-xs text-secondary-t">
                          {formatUsd(ohmReceived * ohmPrice)}
                        </div>
                      )}
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
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleRedeem(position)}
                    >
                      Redeem
                    </Button>
                    {position.data.wrapped && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleTransfer(position, position.displayName)}
                      >
                        Transfer
                      </Button>
                    )}
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
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleUnwrap(position)}
                      >
                        Unwrap
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

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
