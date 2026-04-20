import { useChainId } from "wagmi";
import { TooltipInfo } from "@/components/ui/tooltip";
import {
  usePreviewBid,
  formatOhmOutput,
  formatReceiptTokenAmount,
} from "@/lib/hooks/cds/usePreviewBid";
import { useCurrentTick } from "@/lib/hooks/cds/useCurrentTick";
import { useReceiptTokenId, useReceiptTokenName } from "@/lib/hooks/cds/useReceiptToken";
import { formatTickPrice } from "@/lib/utils/formatters";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import cdUSDSIcon from "@/assets/cdUSDS.png";
import { Icon } from "@/components/icon";

interface DepositPositionInfoProps {
  depositAmount: string;
  selectedTermMonths: number;
}

function getConversionExpiryDate(termMonths: number): string {
  const today = new Date();
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + termMonths * 30);
  return expiryDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function DepositPositionInfo({
  depositAmount,
  selectedTermMonths,
}: DepositPositionInfoProps) {
  const chainId = useChainId();

  const { tickData } = useCurrentTick({
    depositPeriod: selectedTermMonths,
    enabled: selectedTermMonths > 0,
  });

  const { ohmOut, isLoading: isLoadingPreview } = usePreviewBid({
    depositPeriod: selectedTermMonths,
    bidAmount: depositAmount || "0",
    enabled: selectedTermMonths > 0 && !!depositAmount && depositAmount !== "0",
  });

  const usdsTokenAddress = getTokenAddress(TokenName.USDS, chainId);
  const { tokenId } = useReceiptTokenId(
    usdsTokenAddress as `0x${string}` | undefined,
    selectedTermMonths > 0 ? selectedTermMonths : undefined,
  );
  const { tokenName } = useReceiptTokenName(tokenId);

  const displayTokenName = tokenName || `Receipt-${selectedTermMonths}m`;

  return (
    <div className="bg-surface-a3 rounded-2xl p-4 flex flex-col gap-4 border border-a3-b">
      <h3 className="text-sm font-semibold">Position Info</h3>

      <div className="space-y-2">
        <div className="flex justify-between items-center border-b border-a5-b pb-2">
          <TooltipInfo
            className="text-xs text-secondary-t"
            title="The receipt tokens issued for your deposit. They prove your position and are required to redeem your USDS or exercise your Conversion Right at expiry."
          >
            You Receive
          </TooltipInfo>
          <div className="flex items-center gap-1">
            <img src={cdUSDSIcon} alt="Receipt Token" className="w-4 h-4" />
            <span className="text-xs font-semibold">
              {formatReceiptTokenAmount(depositAmount || "0")} {displayTokenName}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center border-b border-a5-b pb-2">
          <TooltipInfo
            className="text-xs text-secondary-t"
            title="The amount of OHM your position can convert into at the predefined conversion price once the deposit term has ended."
          >
            Convertible To
          </TooltipInfo>
          <div className="flex items-center gap-1">
            <Icon name="OHMTokenIcon" className="size-4" />
            <span className="text-xs font-semibold">
              {isLoadingPreview
                ? "Loading..."
                : ohmOut
                  ? `${formatOhmOutput(ohmOut)} OHM`
                  : "0 OHM"}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center border-b border-a5-b pb-2">
          <span className="text-xs text-secondary-t">Price</span>
          <span className="text-xs font-semibold">
            {isLoadingPreview
              ? "Loading..."
              : ohmOut && depositAmount && parseFloat(depositAmount) > 0
                ? `${(parseFloat(depositAmount) / (Number(ohmOut) / 1e9)).toFixed(2)} USDS/OHM`
                : tickData?.price
                  ? `${formatTickPrice(tickData.price)} USDS/OHM`
                  : "--"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-secondary-t">Conversion Expiry</span>
          <span className="text-xs font-semibold">
            {selectedTermMonths > 0 ? getConversionExpiryDate(selectedTermMonths) : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}
