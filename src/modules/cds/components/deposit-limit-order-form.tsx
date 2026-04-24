import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipInfo } from "@/components/ui/tooltip";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { TokenBigInput } from "@/components/ui/token-big-input";
import { CreateLimitOrderModal } from "@/components/create-limit-order-modal";
import { Spinner } from "@/components/spinner";
import { DepositLimitOrderInfo } from "./deposit-limit-order-info";
import { useDepositPeriods } from "@/lib/hooks/cds/useDepositPeriods";
import { useLimitOrderDepositPeriods } from "@/lib/hooks/cds/useLimitOrderDepositPeriods";
import { useCurrentTick } from "@/lib/hooks/cds/useCurrentTick";
import { useToken } from "@/lib/hooks/useToken";
import { useAccount } from "wagmi";
import { useAssetConfiguration } from "@/lib/hooks/cds/useAssetConfiguration";
import { useAuctionParameters } from "@/lib/hooks/cds/useAuctionParameters";
import { parseEther } from "viem";
import {
  calculateMaxPriceAdjustment,
  formatMaxPrice,
  parseMaxPrice,
  validateMaxPrice,
} from "@/lib/utils/priceCalculations";
import { formatTickPrice } from "@/lib/utils/formatters";
import { TokenName } from "@/lib/tokens.ts";

interface LimitOrderFormProps {
  selectedTerm: string;
  onSelectedTermChange: (term: string) => void;
  orderTypeTabs?: React.ReactNode;
}

export const DepositLimitOrderForm: React.FC<LimitOrderFormProps> = ({
  selectedTerm,
  onSelectedTermChange,
  orderTypeTabs,
}) => {
  const { address: userAddress } = useAccount();
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minFillSize, setMinFillSize] = useState<string>("");
  const [incentiveBudget, setIncentiveBudget] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const form = useForm<{ depositAmount: string }>({
    defaultValues: { depositAmount: "" },
  });
  const depositAmount = form.watch("depositAmount");

  // Get available deposit periods from auctioneer
  const { enabledPeriods: auctioneerPeriods, isLoading: isLoadingPeriods } = useDepositPeriods();

  // Filter to only deposit periods enabled on limit orders contract
  const auctioneerPeriodMonths = auctioneerPeriods.map((p) => p.months);
  const { enabledPeriods: limitOrderEnabledMonths } =
    useLimitOrderDepositPeriods(auctioneerPeriodMonths);

  // Create final list of enabled periods for limit orders
  const enabledPeriods = auctioneerPeriods.filter((p) =>
    limitOrderEnabledMonths.includes(p.months),
  );

  // Auto-select valid term if current selection isn't available for limit orders
  useEffect(() => {
    if (enabledPeriods.length > 0 && selectedTerm) {
      const isCurrentTermAvailable = enabledPeriods.some((p) => p.displayName === selectedTerm);
      if (!isCurrentTermAvailable) {
        onSelectedTermChange(enabledPeriods[0].displayName);
      }
    }
  }, [enabledPeriods, selectedTerm, onSelectedTermChange]);

  const usdsToken = useToken(TokenName.USDS, userAddress);
  const { configuration: assetConfig } = useAssetConfiguration(TokenName.USDS);
  const { minimumBid } = useAuctionParameters();

  const getMonthsFromTerm = (term: string): number => {
    if (term.includes("1 month")) return 1;
    if (term.includes("3 months")) return 3;
    if (term.includes("6 months")) return 6;
    const match = term.match(/(\d+)\s*months?/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const selectedTermMonths = getMonthsFromTerm(selectedTerm);

  const { tickData } = useCurrentTick({
    depositPeriod: selectedTermMonths,
    enabled: selectedTermMonths > 0,
  });

  const maxPriceBigInt = maxPrice ? parseMaxPrice(maxPrice) : 0n;
  const currentMarketPrice = tickData?.price || 0n;
  const formattedMinBid = minimumBid ? (Number(minimumBid) / 1e18).toFixed(1) : "1.0";

  const priceValidation =
    maxPriceBigInt > 0n && currentMarketPrice > 0n
      ? validateMaxPrice(maxPriceBigInt, currentMarketPrice)
      : { valid: true };

  const handlePriceAdjustment = (percentage: number) => {
    if (currentMarketPrice > 0n) {
      const adjustedPrice = calculateMaxPriceAdjustment(currentMarketPrice, percentage);
      setMaxPrice(formatMaxPrice(adjustedPrice));
    }
  };

  const buttonState = useMemo(() => {
    if (!userAddress) return { disabled: true, label: "Connect wallet" };
    if (!selectedTerm) return { disabled: true, label: "Select deposit term" };
    if (!depositAmount || depositAmount === "0")
      return { disabled: true, label: "Enter deposit amount" };
    if (!maxPrice || maxPrice === "0") return { disabled: true, label: "Enter max price" };

    try {
      const depositAmountBigInt = parseEther(depositAmount);
      const incentiveBudgetBigInt =
        incentiveBudget && incentiveBudget !== "0" ? parseEther(incentiveBudget) : 0n;
      const totalAmount = depositAmountBigInt + incentiveBudgetBigInt;

      if (assetConfig?.minimumDeposit && depositAmountBigInt < assetConfig.minimumDeposit) {
        return { disabled: true, label: "Below minimum deposit" };
      }
      if (usdsToken?.balance && totalAmount > usdsToken.balance) {
        return { disabled: true, label: "Insufficient USDS balance" };
      }
      if (minFillSize && minFillSize !== "0") {
        const minFillSizeBigInt = parseEther(minFillSize);
        if (minFillSizeBigInt > depositAmountBigInt) {
          return { disabled: true, label: "Min fill > deposit" };
        }
        if (minimumBid && minFillSizeBigInt < minimumBid) {
          return { disabled: true, label: "Min fill < auctioneer minimum" };
        }
      }
    } catch {
      return { disabled: true, label: "Enter deposit amount" };
    }

    if (!priceValidation.valid) return { disabled: true, label: "Invalid price" };

    return { disabled: false, label: "Create Limit Order" };
  }, [
    userAddress,
    selectedTerm,
    depositAmount,
    maxPrice,
    incentiveBudget,
    minFillSize,
    assetConfig?.minimumDeposit,
    usdsToken?.balance,
    minimumBid,
    priceValidation.valid,
  ]);

  const handleCreateOrder = () => setIsModalOpen(true);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          {orderTypeTabs}
          {/* Deposit Terms Tabs */}
          <Tabs value={selectedTerm} onValueChange={onSelectedTermChange} className="gap-2">
            <TooltipInfo
              className="text-sm font-light"
              title="The length of time your deposit remains locked before redemption is available."
            >
              Deposit Terms
            </TooltipInfo>
            <TabsList className="rounded-full w-full">
              {isLoadingPeriods ? (
                <div className="flex items-center gap-2 text-sm text-secondary-t">
                  <Spinner className="size-4" />
                  Loading terms
                </div>
              ) : enabledPeriods.length === 0 ? (
                <div className="text-sm text-secondary-t">No terms available</div>
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
                {[-1, -3, -5, -10].map((pct) => (
                  <Button
                    key={pct}
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePriceAdjustment(pct)}
                    disabled={!currentMarketPrice || currentMarketPrice === 0n}
                    className="rounded-full"
                  >
                    {pct}%
                  </Button>
                ))}
              </div>
              {currentMarketPrice > 0n && (
                <div className="text-sm text-secondary-t">
                  Current: {formatTickPrice(currentMarketPrice)}
                </div>
              )}
            </div>

            {priceValidation.warning && (
              <div className="text-sm text-yellow-500 mt-2">⚠️ {priceValidation.warning}</div>
            )}
          </div>

          {/* Deposit Amount with TokenBigInput */}
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateOrder();
              }}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <TokenBigInput
                      label="Deposit"
                      token={usdsToken}
                      value={field.value}
                      onChange={(val) => field.onChange(val)}
                    />
                    {/* Advanced Settings below TokenBigInput */}
                    <div className="mt-2 pt-3 border-t border-a5-b space-y-2 px-1">
                      <div className="text-xs text-secondary-t font-medium">Advanced</div>

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
                            ⚠️ A zero budget is unlikely to result in your order being filled.
                          </div>
                        )}
                      </div>

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
                  </FormItem>
                )}
              />

              <Button type="submit" size="md" className="w-full" disabled={buttonState.disabled}>
                {buttonState.label}
              </Button>
            </form>
          </Form>
        </div>

        {/* Order Info Panel */}
        <DepositLimitOrderInfo
          depositAmount={depositAmount}
          maxPrice={maxPrice}
          selectedTerm={selectedTerm}
          incentiveBudget={incentiveBudget}
          minFillSize={minFillSize}
          formattedMinBid={formattedMinBid}
        />
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
