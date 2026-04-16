import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipInfo } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { TokenBigInput } from "@/components/ui/token-big-input";
import { InfoIcon, Settings } from "lucide-react";
import { CreatePositionModal } from "@/components/create-position-modal";
import { DepositPositionInfo } from "./deposit-position-info";
import { useDepositPeriods } from "@/lib/hooks/cds/useDepositPeriods";
import { useToken } from "@/lib/hooks/useToken";
import { useAssetConfiguration } from "@/lib/hooks/cds/useAssetConfiguration";
import { useAuctionParameters } from "@/lib/hooks/cds/useAuctionParameters";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { TokenName } from "@/lib/tokens";

interface DepositMarketFormProps {
  selectedTerm: string;
  onSelectedTermChange: (term: string) => void;
  selectedTermMonths: number;
}

export function DepositMarketForm({
  selectedTerm,
  onSelectedTermChange,
  selectedTermMonths,
}: DepositMarketFormProps) {
  const { address: userAddress } = useAccount();
  const [slippage, setSlippage] = useState<string>("1.0");
  const [wrapPosition, setWrapPosition] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const form = useForm<{ depositAmount: string }>({
    defaultValues: { depositAmount: "" },
  });
  const depositAmount = form.watch("depositAmount");

  const { enabledPeriods, isLoading: isLoadingPeriods } = useDepositPeriods();
  const usdsToken = useToken(TokenName.USDS, userAddress);
  const { configuration: assetConfig } = useAssetConfiguration(TokenName.USDS);
  const { isAuctionDisabled } = useAuctionParameters();

  const buttonState = React.useMemo(() => {
    if (!userAddress) return { disabled: true, label: "Connect wallet to deposit" };

    if (!depositAmount || depositAmount === "" || depositAmount === "0") {
      return { disabled: true, label: "Enter deposit amount" };
    }

    try {
      const depositAmountBigInt = parseEther(depositAmount);

      if (usdsToken?.balance && depositAmountBigInt > usdsToken.balance) {
        return { disabled: true, label: "Insufficient USDS balance" };
      }

      if (assetConfig?.minimumDeposit && depositAmountBigInt < assetConfig.minimumDeposit) {
        const minDeposit = (Number(assetConfig.minimumDeposit) / 1e18).toFixed(2);
        return { disabled: true, label: `Minimum deposit: ${minDeposit} USDS` };
      }
    } catch {
      return { disabled: true, label: "Enter deposit amount" };
    }

    if (!selectedTerm) {
      return { disabled: true, label: "Select deposit term" };
    }

    const slippageFloat = parseFloat(slippage);
    if (Number.isNaN(slippageFloat) || slippageFloat < 0 || slippageFloat > 50) {
      return { disabled: true, label: "Invalid slippage (0-50%)" };
    }

    if (isAuctionDisabled) {
      return { disabled: true, label: "Auction is currently disabled" };
    }

    return { disabled: false, label: "Deposit" };
  }, [
    userAddress,
    depositAmount,
    usdsToken?.balance,
    assetConfig?.minimumDeposit,
    selectedTerm,
    slippage,
    isAuctionDisabled,
  ]);

  const handleDeposit = () => setIsModalOpen(true);

  const settingsDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="tertiary" size="sm" className="h-6 w-6 p-0" />}>
        <Settings className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="p-3 space-y-4">
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
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: form */}
        <div className="space-y-4">
          <Tabs value={selectedTerm} onValueChange={onSelectedTermChange}>
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

          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDeposit();
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
                      headerRight={settingsDropdown}
                    />
                  </FormItem>
                )}
              />

              <Button type="submit" size="md" className="w-full" disabled={buttonState.disabled}>
                {buttonState.label}
              </Button>
            </form>
          </Form>
        </div>

        {/* Right column: position info */}
        <DepositPositionInfo
          depositAmount={depositAmount}
          selectedTermMonths={selectedTermMonths}
        />
      </div>

      {isModalOpen && (
        <CreatePositionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          depositAmount={depositAmount}
          selectedTerm={`${selectedTermMonths}m`}
          slippage={slippage}
          wrapPosition={wrapPosition}
          isAuctionDisabled={isAuctionDisabled}
        />
      )}
    </>
  );
}
