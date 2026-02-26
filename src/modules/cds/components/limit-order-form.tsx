import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipInfo } from "@/components/ui/tooltip";
import USDSIcon from "@/assets/USDS.png";
import OHMIcon from "@/assets/OHM.png";
import { CreateLimitOrderModal } from "@/components/create-limit-order-modal";
import { useDepositPeriods } from "@/lib/hooks/cds/useDepositPeriods";
import { useLimitOrderDepositPeriods } from "@/lib/hooks/cds/useLimitOrderDepositPeriods";
import { useLimitOrdersEnabled } from "@/lib/hooks/cds/useLimitOrdersEnabled";
import { useCurrentTick } from "@/lib/hooks/cds/useCurrentTick";
import { useToken } from "@/lib/hooks/useToken";
import { useAccount } from "wagmi";
import { useAssetConfiguration } from "@/lib/hooks/cds/useAssetConfiguration";
import { useAuctionParameters } from "@/lib/hooks/cds/useAuctionParameters";
import { parseEther } from "viem";
import {
  calculateMaxPriceAdjustment,
  calculateOhmAtMaxPrice,
  formatMaxPrice,
  parseMaxPrice,
  validateMaxPrice,
  formatOhm,
} from "@/lib/utils/priceCalculations";
import { formatTickPrice } from "@/lib/utils/formatters";

interface LimitOrderFormProps {
  onOrderTypeChange?: (orderType: "market" | "limit") => void;
  selectedTerm: string;
  onSelectedTermChange: (term: string) => void;
}

export const LimitOrderForm: React.FC<LimitOrderFormProps> = ({
  onOrderTypeChange,
  selectedTerm,
  onSelectedTermChange,
}) => {
  const { address: userAddress } = useAccount();
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minFillSize, setMinFillSize] = useState<string>("");
  const [incentiveBudget, setIncentiveBudget] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check if limit orders are enabled
  const { isEnabled: isLimitOrdersEnabled } = useLimitOrdersEnabled();

  // Get available deposit periods from auctioneer
  const { enabledPeriods: auctioneerPeriods, isLoading: isLoadingPeriods } =
    useDepositPeriods();

  // Filter to only deposit periods enabled on limit orders contract
  const auctioneerPeriodMonths = auctioneerPeriods.map((p) => p.months);
  const { enabledPeriods: limitOrderEnabledMonths } =
    useLimitOrderDepositPeriods(auctioneerPeriodMonths);

  // Create final list of enabled periods for limit orders
  const enabledPeriods = auctioneerPeriods.filter((p) =>
    limitOrderEnabledMonths.includes(p.months)
  );

  // Auto-select valid term if current selection isn't available for limit orders
  useEffect(() => {
    if (enabledPeriods.length > 0 && selectedTerm) {
      const isCurrentTermAvailable = enabledPeriods.some(
        (p) => p.displayName === selectedTerm
      );
      if (!isCurrentTermAvailable) {
        // Current term not available, select first available term
        onSelectedTermChange(enabledPeriods[0].displayName);
      }
    }
  }, [enabledPeriods, selectedTerm, onSelectedTermChange]);

  // Get USDS token balance
  const usdsToken = useToken("USDS", userAddress);

  // Get asset configuration for minimum deposit validation
  const { configuration: assetConfig } = useAssetConfiguration("USDS");

  // Get auction parameters for minimum bid
  const { minimumBid } = useAuctionParameters();

  // Helper function to convert display name to months
  const getMonthsFromTerm = (term: string): number => {
    if (term.includes("1 month")) return 1;
    if (term.includes("3 months")) return 3;
    if (term.includes("6 months")) return 6;
    const match = term.match(/(\d+)\s*months?/);
    return match ? parseInt(match[1]) : 1;
  };

  const selectedTermMonths = getMonthsFromTerm(selectedTerm);

  // Get current tick data for selected period
  const { tickData } = useCurrentTick({
    depositPeriod: selectedTermMonths,
    enabled: selectedTermMonths > 0,
  });

  // Parse max price to bigint for calculations
  const maxPriceBigInt = maxPrice ? parseMaxPrice(maxPrice) : 0n;

  // Calculate expected OHM at max price
  const expectedOhm =
    depositAmount && maxPriceBigInt > 0n
      ? calculateOhmAtMaxPrice(parseEther(depositAmount), maxPriceBigInt)
      : 0n;

  // Get current market price from tick data
  const currentMarketPrice = tickData?.price || 0n;

  // Format minimum bid for display
  const formattedMinBid = minimumBid
    ? (Number(minimumBid) / 1e18).toFixed(1)
    : "1.0";

  // Validate max price
  const priceValidation =
    maxPriceBigInt > 0n && currentMarketPrice > 0n
      ? validateMaxPrice(maxPriceBigInt, currentMarketPrice)
      : { valid: true };

  // Handle quick price adjustment buttons
  const handlePriceAdjustment = (percentage: number) => {
    if (currentMarketPrice > 0n) {
      const adjustedPrice = calculateMaxPriceAdjustment(
        currentMarketPrice,
        percentage
      );
      setMaxPrice(formatMaxPrice(adjustedPrice));
    }
  };

  // Validation logic
  const isFormValid = (): { valid: boolean; reason?: string } => {
    if (!userAddress) {
      return { valid: false, reason: "Connect wallet" };
    }

    if (!selectedTerm) {
      return { valid: false, reason: "Select deposit term" };
    }

    if (!depositAmount || depositAmount === "0") {
      return { valid: false, reason: "Enter deposit amount" };
    }

    if (!maxPrice || maxPrice === "0") {
      return { valid: false, reason: "Enter max price" };
    }

    const depositAmountBigInt = parseEther(depositAmount);

    // Parse incentive budget
    const incentiveBudgetBigInt =
      incentiveBudget && incentiveBudget !== "0"
        ? parseEther(incentiveBudget)
        : 0n;

    // Total amount needed = deposit + incentive
    const totalAmount = depositAmountBigInt + incentiveBudgetBigInt;

    // Check minimum deposit
    if (
      assetConfig?.minimumDeposit &&
      depositAmountBigInt < assetConfig.minimumDeposit
    ) {
      return { valid: false, reason: "Below minimum deposit" };
    }

    // Check sufficient balance (deposit + incentive)
    if (usdsToken?.balance && totalAmount > usdsToken.balance) {
      return { valid: false, reason: "Insufficient USDS balance" };
    }

    // Validate min fill size if provided
    if (minFillSize && minFillSize !== "0") {
      const minFillSizeBigInt = parseEther(minFillSize);

      // Check if min fill size is larger than deposit budget
      if (minFillSizeBigInt > depositAmountBigInt) {
        return { valid: false, reason: "Min fill > deposit" };
      }

      // Check if min fill size is below auctioneer minimum
      if (minimumBid && minFillSizeBigInt < minimumBid) {
        return { valid: false, reason: "Min fill < auctioneer minimum" };
      }
    }

    if (!priceValidation.valid) {
      return { valid: false, reason: "Invalid price" };
    }

    return { valid: true };
  };

  const validation = isFormValid();

  const handleCreateOrder = () => {
    if (validation.valid) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          {/* Order Type Tabs - Only show if limit orders are enabled */}
          {isLimitOrdersEnabled && (
            <Tabs
              value="limit"
              onValueChange={(v) => onOrderTypeChange?.(v as "market" | "limit")}
            >
              <TabsList className="rounded-full w-fit">
                <TabsTrigger value="market" className="rounded-full">Market</TabsTrigger>
                <TabsTrigger value="limit" className="rounded-full">Limit</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Deposit Terms Tabs */}
          <Tabs value={selectedTerm} onValueChange={onSelectedTermChange}>
            <TooltipInfo
              className="text-sm font-light"
              title="The length of time your deposit remains locked before redemption is available."
            >
              Deposit Terms
            </TooltipInfo>
            <TabsList className="rounded-full w-full">
              {isLoadingPeriods ? (
                <div className="text-sm text-secondary-t">Loading terms...</div>
              ) : enabledPeriods.length === 0 ? (
                <div className="text-sm text-secondary-t">
                  No terms available
                </div>
              ) : (
                enabledPeriods.map((period) => (
                  <TabsTrigger
                    key={period.months}
                    value={period.displayName}
                    className="rounded-full focus-visible:outline-none focus-visible:border-0 focus-visible:ring-0"
                  >
                    {period.displayName}
                  </TabsTrigger>
                ))
              )}
            </TabsList>
          </Tabs>

          {/* Max Price Input */}
          <div className="bg-surface-a3 rounded-3xl p-6 border border-a3-b">
            <div className="flex items-center justify-between mb-2">
              <TooltipInfo
                className="text-sm font-medium"
                title="Maximum price you're willing to pay per OHM. Your order will only fill when the market price is at or below this level."
              >
                Max Price (USDS/OHM)
              </TooltipInfo>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="0.0000"
                min={0}
                step="0.0001"
                onScroll={(e) => e.currentTarget.blur()}
                onWheel={(e) => e.currentTarget.blur()}
                className="md:text-2xl h-12 border-0 shadow-none pl-0"
              />
            </div>

            {/* Quick Adjustment Buttons and Current Price */}
            <div className="flex items-center justify-between gap-2 mt-3">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePriceAdjustment(-1)}
                  disabled={!currentMarketPrice || currentMarketPrice === 0n}
                  className="rounded-full"
                >
                  -1%
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePriceAdjustment(-3)}
                  disabled={!currentMarketPrice || currentMarketPrice === 0n}
                  className="rounded-full"
                >
                  -3%
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePriceAdjustment(-5)}
                  disabled={!currentMarketPrice || currentMarketPrice === 0n}
                  className="rounded-full"
                >
                  -5%
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePriceAdjustment(-10)}
                  disabled={!currentMarketPrice || currentMarketPrice === 0n}
                  className="rounded-full"
                >
                  -10%
                </Button>
              </div>

              {/* Current Market Price */}
              {currentMarketPrice > 0n && (
                <div className="text-sm text-secondary-t">
                  Current: {formatTickPrice(currentMarketPrice)}
                </div>
              )}
            </div>

            {/* Price Warning */}
            {priceValidation.warning && (
              <div className="text-sm text-yellow-500 mt-2">
                ⚠️ {priceValidation.warning}
              </div>
            )}
          </div>

          {/* Deposit Amount Input */}
          <div className="bg-surface-a3 rounded-3xl p-6 border border-a3-b">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Deposit</label>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                min={0}
                onScroll={(e) => e.currentTarget.blur()}
                onWheel={(e) => e.currentTarget.blur()}
                className="md:text-4xl h-14 pr-20 placeholder:text-disabled-t border-0 shadow-none pl-0"
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-surface-a3 p-[10px] border border-a3-b">
                  <img src={USDSIcon} alt="USDS" className="w-6 h-6" />
                  <span className="font-medium">USDS</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm">
              <span></span>
              <div className="flex items-center gap-1 text-secondary-t">
                <span>Balance:</span>
                <span>
                  {Number(usdsToken?.formattedBalance).toFixed(2) || "0"}
                </span>
                <Button
                  variant="secondary"
                  className="h-6"
                  onClick={() =>
                    setDepositAmount(usdsToken?.formattedBalance || "0")
                  }
                >
                  Max
                </Button>
              </div>
            </div>

            {/* Advanced Settings - Compact section */}
            <div className="mt-4 pt-4 border-t border-a5-b space-y-2">
              <div className="text-xs text-secondary-t font-medium mb-2">
                Advanced
              </div>

              {/* MEV Incentive */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <TooltipInfo
                    className="text-xs text-secondary-t"
                    title="Optional USDS amount to incentivize MEV bots to fill your order quickly. This is paid in addition to your deposit amount."
                  >
                    MEV Incentive
                  </TooltipInfo>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={incentiveBudget}
                      onChange={(e) => setIncentiveBudget(e.target.value)}
                      placeholder="0"
                      min={0}
                      step="0.01"
                      onScroll={(e) => e.currentTarget.blur()}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="h-7 text-xs w-20 text-right"
                    />
                    <span className="text-xs text-secondary-t w-10">USDS</span>
                  </div>
                </div>
                {(!incentiveBudget || incentiveBudget === "0") && (
                  <div className="text-xs text-yellow-500">
                    ⚠️ A zero budget is unlikely to result in your order being
                    filled.
                  </div>
                )}
              </div>

              {/* Min Fill Size */}
              <div className="flex justify-between items-center text-sm">
                <TooltipInfo
                  className="text-xs text-secondary-t"
                  title="Minimum amount of USDS per fill (except for the final fill). Leave blank to accept any fill size above the auctioneer minimum."
                >
                  Min Fill Size
                </TooltipInfo>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={minFillSize}
                    onChange={(e) => setMinFillSize(e.target.value)}
                    placeholder={formattedMinBid}
                    min={formattedMinBid}
                    step="1"
                    onScroll={(e) => e.currentTarget.blur()}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="h-7 text-xs w-20 text-right"
                  />
                  <span className="text-xs text-secondary-t w-10">USDS</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!validation.valid}
            onClick={handleCreateOrder}
            title={!validation.valid ? validation.reason : undefined}
          >
            {!validation.valid ? validation.reason : "Create Limit Order"}
          </Button>
        </div>

        {/* Position Info Panel */}
        <div className="bg-surface-a3 rounded-3xl p-4 space-y-3 border-a3-b border">
          <h3 className="font-medium">Order Info</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-a5-b pb-2">
              <span className="text-secondary-t">Max Price</span>
              <span className="font-medium">
                {maxPrice || "0.0000"} USDS/OHM
              </span>
            </div>

            <div className="flex justify-between border-b border-a5-b pb-2">
              <TooltipInfo
                title="Estimated OHM you'll receive if your order fills completely at your max price"
                className="text-secondary-t"
              >
                Potential OHM (at max price)
              </TooltipInfo>
              <div className="flex items-center gap-1">
                <img src={OHMIcon} alt="OHM" className="w-4 h-4" />
                <span className="font-medium">
                  {formatOhm(expectedOhm)} OHM
                </span>
              </div>
            </div>

            <div className="flex justify-between border-b border-a5-b pb-2">
              <TooltipInfo
                title="Positions created when your order fills will have this deposit term"
                className="text-secondary-t"
              >
                Deposit Term
              </TooltipInfo>
              <span className="font-medium">{selectedTerm || "-"}</span>
            </div>

            <div className="flex justify-between border-b border-a5-b pb-2">
              <TooltipInfo
                title="Incentive budget for MEV bots to fill your order. Set via the gear icon."
                className="text-secondary-t"
              >
                Incentive Budget
              </TooltipInfo>
              <span className="font-medium">{incentiveBudget || "0"} USDS</span>
            </div>

            <div className="flex justify-between pb-2">
              <span className="text-secondary-t">Min Fill Size</span>
              <span className="font-medium">
                {minFillSize || formattedMinBid} USDS
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-a5-b">
            <p className="text-xs text-secondary-t">
              Your order will be filled when the market price reaches or goes
              below your max price. You'll receive positions as your order
              fills.
            </p>
          </div>
        </div>
      </div>

      <CreateLimitOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        depositAmount={depositAmount}
        selectedTerm={selectedTerm}
        maxPrice={maxPrice}
        minFillSize={minFillSize}
        incentiveBudget={incentiveBudget}
      />
    </>
  );
};
