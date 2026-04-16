import { TooltipInfo } from "@/components/ui/tooltip";
import OHMIcon from "@/assets/OHM.png";
import { calculateOhmAtMaxPrice, parseMaxPrice, formatOhm } from "@/lib/utils/priceCalculations";
import { parseEther } from "viem";

interface DepositLimitOrderInfoProps {
  depositAmount: string;
  maxPrice: string;
  selectedTerm: string;
  incentiveBudget: string;
  minFillSize: string;
  formattedMinBid: string;
}

export function DepositLimitOrderInfo({
  depositAmount,
  maxPrice,
  selectedTerm,
  incentiveBudget,
  minFillSize,
  formattedMinBid,
}: DepositLimitOrderInfoProps) {
  const maxPriceBigInt = maxPrice ? parseMaxPrice(maxPrice) : 0n;
  const expectedOhm =
    depositAmount && maxPriceBigInt > 0n
      ? calculateOhmAtMaxPrice(parseEther(depositAmount), maxPriceBigInt)
      : 0n;

  return (
    <div className="bg-surface-a3 rounded-2xl p-4 flex flex-col gap-4 border border-a3-b">
      <h3 className="text-sm font-semibold">Order Info</h3>

      <div className="space-y-2">
        <div className="flex justify-between items-center border-b border-a5-b pb-2">
          <span className="text-xs text-secondary-t">Max Price</span>
          <span className="text-xs font-semibold">{maxPrice || "0.0000"} USDS/OHM</span>
        </div>

        <div className="flex justify-between items-center border-b border-a5-b pb-2">
          <TooltipInfo
            title="Estimated OHM you'll receive if your order fills completely at your max price"
            className="text-xs text-secondary-t"
          >
            Potential OHM (at max price)
          </TooltipInfo>
          <div className="flex items-center gap-1">
            <img src={OHMIcon} alt="OHM" className="w-4 h-4" />
            <span className="text-xs font-semibold">{formatOhm(expectedOhm)} OHM</span>
          </div>
        </div>

        <div className="flex justify-between items-center border-b border-a5-b pb-2">
          <TooltipInfo
            title="Positions created when your order fills will have this deposit term"
            className="text-xs text-secondary-t"
          >
            Deposit Term
          </TooltipInfo>
          <span className="text-xs font-semibold">{selectedTerm || "-"}</span>
        </div>

        <div className="flex justify-between items-center border-b border-a5-b pb-2">
          <TooltipInfo
            title="Incentive budget for MEV bots to fill your order."
            className="text-xs text-secondary-t"
          >
            Incentive Budget
          </TooltipInfo>
          <span className="text-xs font-semibold">{incentiveBudget || "0"} USDS</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-secondary-t">Min Fill Size</span>
          <span className="text-xs font-semibold">{minFillSize || formattedMinBid} USDS</span>
        </div>
      </div>

      <p className="text-xs text-secondary-t">
        Your order will be filled when the market price reaches or goes below your max price. You'll
        receive positions as your order fills.
      </p>
    </div>
  );
}
