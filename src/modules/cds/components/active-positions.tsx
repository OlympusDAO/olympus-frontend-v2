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
import OHMIcon from "@/assets/OHM.png";
import cdUSDSIcon from "@/assets/cdUSDS.png";
import { ConvertToOHMModal } from "@/components/convert-to-ohm-modal";
import { WrapPositionModal } from "@/components/wrap-position-modal";
import { TransferPositionModal } from "@/components/transfer-position-modal";
import { RedeemPositionModal } from "@/components/redeem-position-modal";
import { useUserPositions } from "@/lib/hooks/cds/useUserPositions";
import { formatEther } from "viem";
import { useDiscount } from "@/lib/hooks/cds/useDiscount";
import { useOhmPrice } from "@/lib/hooks/useOhmPrice";
import { formatTermSuffix } from "@/lib/utils";
import { useReceiptTokenId, useReceiptTokenName } from "@/lib/hooks/cds/useReceiptToken";

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

// Component to display discount for individual positions
const PositionDiscount = ({ conversionPrice }: { conversionPrice: bigint }) => {
  const { formattedDiscount, isLoading } = useDiscount(conversionPrice);

  if (isLoading) return <span className="text-secondary-t font-medium">Loading...</span>;

  return <span className="text-secondary-t font-medium">{formattedDiscount}</span>;
};

// Component to display dynamic token name
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

  // Use fallback (no loading state to avoid jerkiness)
  const displayName = tokenName || `Receipt-${formatTermSuffix(periodMonths)}`;

  return (
    <span>
      {amount} {displayName}
    </span>
  );
};

export const ActivePositions = () => {
  const { formattedPrice: ohmPrice, isLoading: isOhmPriceLoading } = useOhmPrice();
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

  // Get user positions
  const { positions, isLoading: isLoadingPositions, error: positionsError } = useUserPositions();

  // Helper function to format position data
  const formatPositionAmount = (remainingDeposit: bigint) => {
    return parseFloat(formatEther(remainingDeposit)).toFixed(2);
  };

  const formatExpiryDate = (expiry: number) => {
    const date = new Date(expiry * 1000);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getDaysUntilExpiry = (expiry: number) => {
    const expiryDate = new Date(expiry * 1000);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateOhmReceived = (remainingDeposit: bigint, conversionPrice: bigint) => {
    // remainingDeposit is in 18 decimals, conversionPrice is in 18 decimals
    // OHM has 9 decimals, so we need to adjust the result
    // Formula: (remainingDeposit * 1e9) / conversionPrice
    const ohmAmount = (remainingDeposit * BigInt(1e9)) / conversionPrice;
    // Convert from 9 decimal places to display format
    return (Number(ohmAmount) / 1e9).toFixed(2);
  };

  const calculateOhmUsdValue = (ohmAmount: string) => {
    if (isOhmPriceLoading || !ohmPrice) return "$0.00";
    const usdValue = parseFloat(ohmAmount) * parseFloat(ohmPrice);
    return `$${usdValue.toFixed(2)}`;
  };

  const handleConvert = (position: Position) => {
    if (!position.data) return;
    // Convert to the expected modal position format
    const modalPosition = {
      id: position.id,
      data: {
        remainingDeposit: position.data.remainingDeposit,
        conversionPrice: position.data.conversionPrice,
        periodMonths: position.data.periodMonths,
        expiry: BigInt(position.data.expiry),
        asset: position.data.asset,
      },
    };
    setSelectedConvertPosition(modalPosition);
    setIsConvertModalOpen(true);
  };

  const handleCloseConvertModal = () => {
    setIsConvertModalOpen(false);
    setSelectedConvertPosition(null);
  };

  const handleWrap = (position: Position) => {
    if (!position.data) return;
    // Convert to the expected modal position format
    const modalPosition = {
      id: position.id,
      data: {
        remainingDeposit: position.data.remainingDeposit,
        conversionPrice: position.data.conversionPrice,
        periodMonths: position.data.periodMonths,
        expiry: BigInt(position.data.expiry),
      },
    };
    setSelectedPosition(modalPosition);
    setWrapModalMode("wrap");
    setIsWrapModalOpen(true);
  };

  const handleUnwrap = (position: Position) => {
    if (!position.data) return;
    // Convert to the expected modal position format
    const modalPosition = {
      id: position.id,
      data: {
        remainingDeposit: position.data.remainingDeposit,
        conversionPrice: position.data.conversionPrice,
        periodMonths: position.data.periodMonths,
        expiry: BigInt(position.data.expiry),
      },
    };
    setSelectedPosition(modalPosition);
    setWrapModalMode("unwrap");
    setIsWrapModalOpen(true);
  };

  const handleCloseWrapModal = () => {
    setIsWrapModalOpen(false);
    setSelectedPosition(null);
  };

  const handleTransfer = (position: Position) => {
    if (!position.data) return;
    // Note: displayName will be fetched dynamically in the modal using ReceiptTokenManager
    const displayName = `cdUSDS-${formatTermSuffix(position.data.periodMonths)}`;
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

  const handleCloseTransferModal = () => {
    setIsTransferModalOpen(false);
    setSelectedTransferPosition(null);
  };

  const handleRedeem = (position: Position) => {
    setSelectedRedeemPosition(position);
    setIsRedeemModalOpen(true);
  };

  const handleCloseRedeemModal = () => {
    setIsRedeemModalOpen(false);
    setSelectedRedeemPosition(null);
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-3">Active Positions</h2>
      <Card className="p-6 space-y-4">
        {isLoadingPositions ? (
          <div className="text-center py-8 text-secondary-t">Loading positions...</div>
        ) : positionsError ? (
          <div className="text-center py-8 text-red-600">Error loading positions</div>
        ) : positions.length === 0 ? (
          <div className="text-center py-8 text-secondary-t">No active positions</div>
        ) : (
          <>
            {/* Mobile cards view */}
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
                  <div key={position.id.toString()} className="rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={cdUSDSIcon} alt="Receipt Token" className="w-8 h-8" />
                      <div>
                        <div className="font-medium">
                          <PositionTokenName
                            asset={position.data.asset}
                            periodMonths={position.data.periodMonths}
                            amount={amount}
                          />
                        </div>
                        <div className="text-sm text-secondary-t">${amount}</div>
                      </div>
                      <span className="text-gray-400 mx-2">→</span>
                      <img src={OHMIcon} alt="OHM" className="w-8 h-8" />
                      <div>
                        <div className="font-medium">{ohmReceived} OHM</div>
                        <div className="text-sm text-secondary-t">
                          {calculateOhmUsdValue(ohmReceived)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-secondary-t">Status:</span>
                        <div className="mt-1 flex flex-col gap-1">
                          <Badge className="bg-green/20 text-green rounded-full px-3 py-1 w-fit">
                            Convertible
                          </Badge>
                          {position.data.wrapped && (
                            <Badge className="bg-purple/20 text-purple rounded-full px-3 py-1 w-fit">
                              NFT
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-t">Discount:</span>
                        <div className="mt-1">
                          <PositionDiscount conversionPrice={position.data.conversionPrice} />
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-t">Price:</span>
                        <div className="mt-1 font-medium">{conversionPrice} USDS/OHM</div>
                      </div>
                      <div>
                        <span className="text-secondary-t">Expiry:</span>
                        <div className="mt-1 font-medium">{expiryDate}</div>
                        <div className="text-xs text-secondary-t">
                          {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1" onClick={() => handleConvert(position)}>
                        Convert
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRedeem(position)}
                      >
                        Redeem
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

            {/* Desktop table view */}
            <Table className="hidden md:table">
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="border-b-0">
                  <TableHead className="text-secondary-t font-normal">Convertible</TableHead>
                  <TableHead className="text-secondary-t font-normal">Status</TableHead>
                  <TableHead className="text-secondary-t font-normal">Price</TableHead>
                  <TableHead className="text-secondary-t font-normal">Discount</TableHead>
                  <TableHead className="text-secondary-t font-normal">Conversion Expiry</TableHead>
                  <TableHead className="text-secondary-t font-normal text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                    <TableRow key={position.id.toString()} className="border-b-0">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3 w-fit">
                          <div className="flex items-center gap-3 border rounded-full p-[6px] border-a10-b pr-4 shrink-0 w-fit">
                            <img
                              src={cdUSDSIcon}
                              alt="Receipt Token"
                              className="w-8 h-8 shrink-0"
                            />
                            <div className="flex flex-col">
                              <div className="font-medium whitespace-nowrap">
                                <PositionTokenName
                                  asset={position.data.asset}
                                  periodMonths={position.data.periodMonths}
                                  amount={amount}
                                />
                              </div>
                              <div className="text-sm text-secondary-t whitespace-nowrap">
                                ${amount}
                              </div>
                            </div>
                          </div>
                          <span className="text-gray-400 mx-2 shrink-0">→</span>
                          <div className="flex items-center gap-3 border rounded-full p-[6px] border-a10-b pr-4 shrink-0 w-fit">
                            <img src={OHMIcon} alt="OHM" className="w-8 h-8 shrink-0" />
                            <div className="flex flex-col">
                              <div className="font-medium whitespace-nowrap">{ohmReceived} OHM</div>
                              <div className="text-sm text-secondary-t whitespace-nowrap">
                                {calculateOhmUsdValue(ohmReceived)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1">
                          <Badge className="bg-green/20 text-green rounded-full px-3 py-1 w-fit">
                            Convertible
                          </Badge>
                          {position.data.wrapped && (
                            <Badge className="bg-purple/20 text-purple rounded-full px-3 py-1 w-fit">
                              NFT
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="font-medium">{conversionPrice} USDS/OHM</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <PositionDiscount conversionPrice={position.data.conversionPrice} />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="font-medium">{expiryDate}</div>
                          <div className="text-sm text-secondary-t">
                            {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" onClick={() => handleConvert(position)}>
                            Convert
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRedeem(position)}
                          >
                            Redeem
                          </Button>
                          {position.data.wrapped && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTransfer(position)}
                            >
                              Transfer
                            </Button>
                          )}
                          {!position.data.wrapped ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="rounded-full"
                              onClick={() => handleWrap(position)}
                            >
                              Wrap
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="rounded-full"
                              onClick={() => handleUnwrap(position)}
                            >
                              Unwrap
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </Card>

      {/* Modals - only render when needed */}
      {isConvertModalOpen && selectedConvertPosition && (
        <ConvertToOHMModal
          isOpen={isConvertModalOpen}
          onClose={handleCloseConvertModal}
          position={selectedConvertPosition}
        />
      )}

      {isWrapModalOpen && selectedPosition && (
        <WrapPositionModal
          isOpen={isWrapModalOpen}
          onClose={handleCloseWrapModal}
          position={selectedPosition}
          mode={wrapModalMode}
        />
      )}

      {isTransferModalOpen && selectedTransferPosition && (
        <TransferPositionModal
          isOpen={isTransferModalOpen}
          onClose={handleCloseTransferModal}
          position={selectedTransferPosition}
        />
      )}

      {isRedeemModalOpen && selectedRedeemPosition && (
        <RedeemPositionModal
          isOpen={isRedeemModalOpen}
          onClose={handleCloseRedeemModal}
          position={selectedRedeemPosition}
        />
      )}
    </>
  );
};
