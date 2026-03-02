import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import conversionPriceIcon from "@/assets/conversion-price.png";
import currentPriceIcon from "@/assets/current-price.png";
import USDSIcon from "@/assets/USDS.png";
import { Tooltip, TooltipInfo } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InfoIcon, Settings } from "lucide-react";
import { CreatePositionModal } from "@/components/create-position-modal";
import { ActivePositions } from "../components/active-positions";
import { OpenLimitOrders } from "../components/open-limit-orders";
import { LimitOrderForm } from "../components/limit-order-form";
import { TokenBalances } from "../components/token-balances";
import { DailyCapacityCard } from "../components/daily-capacity-card";
import { useDepositPeriods } from "@/lib/hooks/cds/useDepositPeriods";
import { useLimitOrdersEnabled } from "@/lib/hooks/cds/useLimitOrdersEnabled";
import { useCurrentTick } from "@/lib/hooks/cds/useCurrentTick";
import { formatTickPrice, formatTickCapacity } from "@/lib/utils/formatters";
import { calculateNextTick } from "@/lib/utils/auctionUtils";
import {
  usePreviewBid,
  formatOhmOutput,
  formatReceiptTokenAmount,
} from "@/lib/hooks/cds/usePreviewBid";
import { useToken } from "@/lib/hooks/useToken";
import { useAccount, useChainId } from "wagmi";
import { useAssetConfiguration } from "@/lib/hooks/cds/useAssetConfiguration";
import { parseEther } from "viem";
import cdUSDSIcon from "@/assets/cdUSDS.png";
import OHMIcon from "@/assets/OHM.png";
import trendingDownIcon from "@/assets/trending-down.svg";

import { useAuctionParameters } from "@/lib/hooks/cds/useAuctionParameters";
import { useReceiptTokenId, useReceiptTokenName } from "@/lib/hooks/cds/useReceiptToken";
import { getTokenAddress } from "@/lib/tokens";
import { useDayState } from "@/lib/hooks/cds/useDayState";
import { CircularProgress } from "@/components/ui/circular-progress";
import { useCurrentTickSize } from "@/lib/hooks/cds/useCurrentTickSize";
import { PriceChart } from "@/components/price-chart";

export const CDPage = () => {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [positionTab, setPositionTab] = useState<"active" | "orders">("active");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [slippage, setSlippage] = useState<string>("1.0"); // Default 1% slippage
  const [wrapPosition, setWrapPosition] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get available deposit periods
  const { enabledPeriods, isLoading: isLoadingPeriods } = useDepositPeriods();

  // Check if limit orders are enabled
  const { isEnabled: isLimitOrdersEnabled } = useLimitOrdersEnabled();

  // Get USDS token balance
  const usdsToken = useToken("USDS", userAddress);

  // Get asset configuration for minimum deposit validation
  const { configuration: assetConfig } = useAssetConfiguration("USDS");

  // Helper function to convert display name to months
  const getMonthsFromTerm = (term: string): number => {
    if (term.includes("1 month")) return 1;
    if (term.includes("3 months")) return 3;
    if (term.includes("6 months")) return 6;
    // Try to extract number for dynamic periods
    const match = term.match(/(\d+)\s*months?/);
    return match ? parseInt(match[1], 10) : 1;
  };

  // Convert selected term to months for the API call
  const selectedTermMonths = getMonthsFromTerm(selectedTerm);

  // Get current tick data for selected period
  const { tickData, isLoading: isLoadingTick } = useCurrentTick({
    depositPeriod: selectedTermMonths,
    enabled: selectedTermMonths > 0,
  });

  // Get preview bid data for position info
  const { ohmOut, isLoading: isLoadingPreview } = usePreviewBid({
    depositPeriod: selectedTermMonths,
    bidAmount: depositAmount || "0",
    enabled: selectedTermMonths > 0 && !!depositAmount && depositAmount !== "0",
  });

  // Check if all auctions are disabled globally (target === 0)
  const { auctionParameters, depositPeriodsCount, isAuctionDisabled, tickStep } =
    useAuctionParameters();

  const { dayState } = useDayState();

  // Get current tick size (dynamic based on day target reached)
  const { currentTickSize } = useCurrentTickSize();

  // Track capacity changes for animation
  const [prevCapacity, setPrevCapacity] = useState<bigint | null>(null);
  const [capacityChanged, setCapacityChanged] = useState(false);
  const [capacityIncreased, setCapacityIncreased] = useState(true);

  useEffect(() => {
    if (tickData?.capacity && prevCapacity !== null && tickData.capacity !== prevCapacity) {
      setCapacityChanged(true);
      setCapacityIncreased(tickData.capacity > prevCapacity);
      const timer = setTimeout(() => setCapacityChanged(false), 500);
      return () => clearTimeout(timer);
    }
    if (tickData?.capacity) {
      setPrevCapacity(tickData.capacity);
    }
  }, [tickData?.capacity, prevCapacity]);

  // Get receipt token name for display
  const usdsTokenAddress = getTokenAddress("USDS", chainId);
  const { tokenId } = useReceiptTokenId(
    usdsTokenAddress as `0x${string}` | undefined,
    selectedTermMonths > 0 ? selectedTermMonths : undefined,
  );
  const { tokenName } = useReceiptTokenName(tokenId);

  // Helper function to calculate conversion expiry date
  const getConversionExpiryDate = (termMonths: number): string => {
    const today = new Date();
    const expiryDate = new Date(today);
    const daysToAdd = termMonths * 30;
    expiryDate.setDate(today.getDate() + daysToAdd);

    return expiryDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Validation logic for deposit button
  const isDepositValid = React.useMemo(() => {
    // Check if wallet is connected
    if (!userAddress) return { valid: false, reason: "Connect wallet to deposit" };

    // Check if deposit amount is entered
    if (!depositAmount || depositAmount === "" || depositAmount === "0") {
      return { valid: false, reason: "Enter deposit amount" };
    }

    const depositAmountBigInt = parseEther(depositAmount);

    // Check if user has sufficient balance
    if (usdsToken?.balance && depositAmountBigInt > usdsToken.balance) {
      return { valid: false, reason: "Insufficient USDS balance" };
    }

    // Check if deposit meets minimum requirement
    if (assetConfig?.minimumDeposit && depositAmountBigInt < assetConfig.minimumDeposit) {
      const minDeposit = (Number(assetConfig.minimumDeposit) / 1e18).toFixed(2);
      return { valid: false, reason: `Minimum deposit: ${minDeposit} USDS` };
    }

    // Check if term is selected
    if (!selectedTerm) {
      return { valid: false, reason: "Select deposit term" };
    }

    // Check if slippage is valid
    const slippageFloat = parseFloat(slippage);
    if (Number.isNaN(slippageFloat) || slippageFloat < 0 || slippageFloat > 50) {
      return { valid: false, reason: "Invalid slippage (0-50%)" };
    }

    // Check if auction is disabled (target === 0)
    if (isAuctionDisabled) {
      return { valid: false, reason: "Auction is currently disabled" };
    }

    return { valid: true, reason: "" };
  }, [
    userAddress,
    depositAmount,
    usdsToken?.balance,
    assetConfig?.minimumDeposit,
    selectedTerm,
    slippage,
    isAuctionDisabled,
  ]);

  // Set default selected term once periods are loaded
  React.useEffect(() => {
    if (enabledPeriods.length > 0 && !selectedTerm) {
      setSelectedTerm(enabledPeriods[0].displayName);
    }
  }, [enabledPeriods, selectedTerm]);

  const handleDeposit = () => {
    if (depositAmount) {
      setIsModalOpen(true);
    }
  };

  const getTermSuffix = (term: string) => {
    const months = getMonthsFromTerm(term);
    return `${months}m`;
  };

  // Use dynamic token name with fallback (no loading state to avoid jerkiness)
  const displayTokenName = tokenName || `Receipt-${getTermSuffix(selectedTerm)}`;

  return (
    <div className="space-y-8">
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Conversion Price Card */}
          <Card className="flex flex-row items-center p-2 gap-3 h-[100px]">
            <img src={conversionPriceIcon} alt="Conversion Price" className="w-12 h-12" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <TooltipInfo title="The fixed price at which your deposit can be converted into OHM before maturity. If OHM's market price is above this level, your Conversion Right is valuable and you can acquire OHM at a discount. If not, you can redeem your stablecoins 1:1 instead.">
                  Conversion Price
                </TooltipInfo>
              </div>
              <div className="text-2xl font-bold leading-none">
                {isLoadingTick
                  ? "Loading..."
                  : tickData
                    ? `${formatTickPrice(tickData.price)} USDS/OHM`
                    : "--"}
              </div>
              <div className="text-xs text-secondary-t mt-1 flex items-center gap-1">
                {(() => {
                  const nextTickInfo = calculateNextTick(
                    tickData,
                    auctionParameters,
                    depositPeriodsCount,
                    tickStep,
                    currentTickSize,
                  );
                  if (!nextTickInfo) return <span>--</span>;

                  // Special handling for min price reached
                  if (nextTickInfo.timeUntilTick === "Min Price Reached") {
                    return <span>{nextTickInfo.timeUntilTick}</span>;
                  }

                  return (
                    <>
                      <img src={trendingDownIcon} alt="trending down" className="w-4 h-4" />
                      <span>{nextTickInfo.nextPrice}</span>
                      <span className="text-secondary-t mx-1">in</span>
                      <span>{nextTickInfo.timeUntilTick}</span>
                      <TooltipInfo title="Time until the next price decay tick.">
                        <span className="sr-only">Info</span>
                      </TooltipInfo>
                    </>
                  );
                })()}
              </div>
            </div>
          </Card>

          {/* Capacity at Current Price Card */}
          <Card className="flex flex-row items-center p-2 gap-3 h-[100px]">
            <img src={currentPriceIcon} alt="Capacity" className="w-12 h-12" />
            <div className="flex-1 min-w-0">
              <TooltipInfo title="The amount of OHM available at the current price. ">
                Available at Current Price
              </TooltipInfo>
              <div
                className={`text-2xl font-bold leading-none transition-all duration-300 origin-left ${
                  capacityChanged
                    ? capacityIncreased
                      ? "text-green scale-110"
                      : "text-red scale-110"
                    : ""
                }`}
              >
                {isLoadingTick
                  ? "Loading..."
                  : tickData
                    ? `${formatTickCapacity(tickData.capacity)} OHM`
                    : "--"}
              </div>
              <div className="text-xs text-secondary-t mt-1 flex items-center gap-2">
                <CircularProgress
                  value={(() => {
                    const tickSize = currentTickSize ?? auctionParameters?.tickSize;
                    if (!tickData?.capacity || !tickSize) return 0;
                    return Math.min(100, (Number(tickData.capacity) / Number(tickSize)) * 100);
                  })()}
                  size={16}
                  strokeWidth={3}
                  trackColor="text-surface-a3"
                  indicatorColor="text-green"
                />
                <span>
                  out of {(() => {
                    const tickSize = currentTickSize ?? auctionParameters?.tickSize;
                    return tickSize ? formatTickCapacity(tickSize) : "--";
                  })()} OHM / tick
                </span>
              </div>
            </div>
          </Card>

          {/* Daily Target Card */}
          <DailyCapacityCard dayState={dayState} target={auctionParameters?.target} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Create Position</h2>
        <Card className="p-6 space-y-6">
          {orderType === "market" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                {/* Order Type Tabs - Only show if limit orders are enabled */}
                {isLimitOrdersEnabled && (
                  <Tabs
                    value={orderType}
                    onValueChange={(v) => setOrderType(v as "market" | "limit")}
                  >
                    <TabsList className="rounded-full w-fit">
                      <TabsTrigger value="market" className="rounded-full">
                        Market
                      </TabsTrigger>
                      <TabsTrigger value="limit" className="rounded-full">
                        Limit
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                <Tabs value={selectedTerm} onValueChange={setSelectedTerm}>
                  <TooltipInfo
                    className="text-sm font-light"
                    title="The length of time your deposit remains locked before redemption is available. You can choose different terms (e.g., 3 or 6 months), which determine when you can redeem your stablecoins or exercise your Conversion Right into OHM."
                  >
                    Deposit Terms
                  </TooltipInfo>
                  <TabsList className="rounded-full w-full">
                    {isLoadingPeriods ? (
                      <div className="text-sm text-secondary-t">Loading terms...</div>
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
                <div className="bg-surface-a3 rounded-3xl p-6 border border-a3-b">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Deposit</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="sm" className="h-6 w-6 p-0" />}
                      >
                        <Settings className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <div className="p-3 space-y-4">
                          {/* Slippage Configuration */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">
                                Slippage Tolerance{" "}
                                <Tooltip title="Maximum acceptable slippage for your deposit">
                                  <InfoIcon className="w-3 h-3 text-gray-400" />
                                </Tooltip>
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={slippage}
                                onChange={(e) => setSlippage(e.target.value)}
                                className="flex-1 h-8 text-xs"
                                min="0"
                                max="50"
                                step="0.1"
                                placeholder="1.0"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </div>
                          </div>

                          {/* ERC-721 Position Toggle */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span>
                                <Label className="text-xs font-medium">
                                  Wrap Position{" "}
                                  <Tooltip title="Wrap position as ERC-721 NFT for transferability">
                                    <InfoIcon className="w-3 h-3 text-gray-400" />
                                  </Tooltip>
                                </Label>{" "}
                              </span>
                              <Switch checked={wrapPosition} onCheckedChange={setWrapPosition} />
                            </div>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                  <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                    <span></span>
                    <div className="flex items-center gap-1">
                      <span>Balance:</span>
                      <span>{Number(usdsToken?.formattedBalance).toFixed(2) || "0"}</span>
                      <Button
                        variant="secondary"
                        className="h-6"
                        onClick={() => setDepositAmount(usdsToken?.formattedBalance || "0")}
                      >
                        Max
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={!isDepositValid.valid}
                  onClick={handleDeposit}
                  title={!isDepositValid.valid ? isDepositValid.reason : undefined}
                >
                  {!isDepositValid.valid ? isDepositValid.reason : "Deposit"}
                </Button>
              </div>

              <div className="bg-surface-a3 rounded-3xl p-4 space-y-3 border-a3-b border">
                <h3 className="font-medium">Position Info</h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-a5-b pb-2">
                    <TooltipInfo
                      className="text-secondary-t font-light"
                      title="The receipt tokens issued for your deposit. They prove your position and are required to redeem your USDS or exercise your Conversion Right at expiry."
                    >
                      You Receive
                    </TooltipInfo>
                    <div className="flex items-center gap-1">
                      <img src={cdUSDSIcon} alt="Receipt Token" className="w-4 h-4" />
                      <span className="font-medium">
                        {formatReceiptTokenAmount(depositAmount || "0")} {displayTokenName}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between border-b border-a5-b pb-2">
                    <TooltipInfo
                      className="text-secondary-t font-light"
                      title="The amount of OHM your position can convert into at the predefined conversion price once the deposit term has ended."
                    >
                      Convertible To
                    </TooltipInfo>
                    <div className="flex items-center gap-1">
                      <img src={OHMIcon} alt="OHM" className="w-4 h-4" />
                      <span className="font-medium">
                        {isLoadingPreview
                          ? "Loading..."
                          : ohmOut
                            ? `${formatOhmOutput(ohmOut)} OHM`
                            : "0 OHM"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between border-b border-a5-b pb-2">
                    <span className="text-secondary-t font-light">Price</span>
                    <span className="font-medium">
                      {isLoadingPreview
                        ? "Loading..."
                        : ohmOut && depositAmount && parseFloat(depositAmount) > 0
                          ? `${(parseFloat(depositAmount) / (Number(ohmOut) / 1e9)).toFixed(
                              2,
                            )} USDS/OHM`
                          : tickData?.price
                            ? `${formatTickPrice(tickData.price)} USDS/OHM`
                            : "--"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-a5-b pb-2">
                    <span className="text-secondary-t font-light">Conversion Expiry</span>
                    <span className="font-medium">
                      {selectedTermMonths > 0 ? getConversionExpiryDate(selectedTermMonths) : "--"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <LimitOrderForm
              onOrderTypeChange={setOrderType}
              selectedTerm={selectedTerm}
              onSelectedTermChange={setSelectedTerm}
            />
          )}
        </Card>
      </div>

      {/* Price Chart */}
      <PriceChart depositPeriod={selectedTermMonths} />

      {/* Positions and Orders Tabs */}
      <div>
        <Tabs value={positionTab} onValueChange={(v) => setPositionTab(v as "active" | "orders")}>
          <TabsList className="rounded-full w-fit mb-3">
            <TabsTrigger value="active" className="rounded-full">
              Active Positions
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-full">
              Open Orders
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {positionTab === "active" ? <ActivePositions /> : <OpenLimitOrders />}
      </div>

      <TokenBalances />
      {isModalOpen && (
        <CreatePositionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          depositAmount={depositAmount}
          selectedTerm={getTermSuffix(selectedTerm)}
          slippage={slippage}
          wrapPosition={wrapPosition}
          isAuctionDisabled={isAuctionDisabled}
        />
      )}
    </div>
  );
};
