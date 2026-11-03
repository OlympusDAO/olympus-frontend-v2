import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { ChevronDownIcon, Settings } from "lucide-react";
import { RiInformationLine } from "@remixicon/react";
import { formatUnits } from "viem";
import { formatTokenAmount } from "@/lib/math";
import { useAccount, useBalance, useBytecode, useChainId } from "wagmi";
import { Icon } from "@/components/icon.tsx";
import { ChainIcon } from "@/components/chain-icon.tsx";
import { Form, FormField, FormItem } from "@/components/ui/form.tsx";
import { Button } from "@/components/ui/button.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { mainnet } from "@/lib/chains";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance.tsx";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import { useTokenPrice } from "@/lib/hooks/useTokenPrice.tsx";
import { TokenName, getTokenAddress } from "@/lib/tokens.ts";
import { ContractName, getContractAddress } from "@/lib/contracts.ts";
import { handleInputNumberChange, shortenAddress } from "@/lib/helpers.ts";
import { ROUTE_UNAVAILABLE_COPY } from "@/lib/hooks/bridge/routeState";
import { useBridgeLimits } from "@/lib/hooks/bridge/useBridgeLimits";
import { useBridgeRoute } from "@/lib/hooks/bridge/useBridgeRoute";
import { useEstimateBridgeFee } from "@/lib/hooks/bridge/useEstimateBridgeFee";
import { getSafeFee } from "@/lib/hooks/bridge/safeFee";
import { useSafeContext } from "@/lib/hooks/bridge/useSafeContext";
import { clampOhmDecimals, getBridgeCta, parseOhmAmount } from "../utils/bridgeCta.ts";
import { getBridgeChain, BRIDGEABLE_DESTINATIONS, type BridgeChain } from "../utils/constants.ts";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";

const OHM_DECIMALS = 9;

interface BridgeFormProps {
  sourceChainId: number;
  destinationChainId: number;
  amount: string;
  recipientAddress?: `0x${string}`;
  onAmountChange: (amount: string) => void;
  onOpenSourceChainModal: () => void;
  onOpenDestChainModal: () => void;
  onOpenSettingsModal: () => void;
  onSwapChains: () => void;
  onSwitchNetwork: () => void;
  onSubmit: () => void;
}

export function BridgeForm({
  sourceChainId,
  destinationChainId,
  amount,
  recipientAddress,
  onAmountChange,
  onOpenSourceChainModal,
  onOpenDestChainModal,
  onOpenSettingsModal,
  onSwapChains,
  onSwitchNetwork,
  onSubmit,
}: BridgeFormProps) {
  const { address } = useAccount();
  const walletChainId = useChainId();

  const form = useForm<{ amount: string }>({
    defaultValues: { amount: "" },
  });

  useEffect(() => {
    form.setValue("amount", amount);
  }, [amount, form]);

  const sourceChain = getBridgeChain(sourceChainId);
  const destChain = getBridgeChain(destinationChainId);

  // Read everything from the source chain, which the wallet may not be on yet.
  const ohmAddress = getTokenAddress(TokenName.OHM, sourceChainId);
  const { balance: ohmBalance } = useTokenBalance(ohmAddress, address, sourceChainId);
  const { price: ohmPrice } = useTokenPrice(mainnet.id, getTokenAddress(TokenName.OHM, mainnet.id));
  const ohmToken = { balance: ohmBalance, decimals: OHM_DECIMALS, price: ohmPrice };

  const { data: nativeBalance } = useBalance({
    address,
    chainId: sourceChainId,
  });

  const amountBigInt = useMemo(() => parseOhmAmount(amount), [amount]);

  const bridgeAddress = getContractAddress(ContractName.CCIP_BRIDGE, sourceChainId);
  const { allowance } = useTokenAllowance(
    ohmAddress as `0x${string}`,
    address,
    bridgeAddress,
    sourceChainId,
  );
  const hasSufficientAllowance =
    allowance != null && amountBigInt > 0n && allowance >= amountBigInt;

  const {
    nativeFee,
    isLoading: isFeeLoading,
    error: feeError,
  } = useEstimateBridgeFee({
    sourceChainId,
    destinationChainId,
    recipientAddress,
    amount: amountBigInt,
  });

  const route = useBridgeRoute(sourceChainId, destinationChainId);
  const { status: amountStatus } = useBridgeLimits(sourceChainId, destinationChainId, amountBigInt);

  const { kind: walletKind, isSafeApp } = useSafeContext(sourceChainId);
  const isSafe = walletKind === "safe";
  const isContractWallet = isSafe || walletKind === "contract";
  const { data: destinationCode } = useBytecode({
    address,
    chainId: destinationChainId,
    query: { enabled: !!address && isContractWallet },
  });

  const isCustomRecipient =
    !!recipientAddress && !!address && recipientAddress.toLowerCase() !== address.toLowerCase();

  // Fail closed: until the read says otherwise, the wallet isn't known to exist on the destination.
  const needsRecipient = isContractWallet && !isCustomRecipient && !destinationCode;

  const canSwap = useMemo(() => {
    const destRoutes = BRIDGEABLE_DESTINATIONS[destinationChainId];
    return !isSafeApp && (destRoutes?.includes(sourceChainId) ?? false);
  }, [sourceChainId, destinationChainId, isSafeApp]);

  const cta = getBridgeCta({
    isConnected: !!address,
    walletChainId,
    source: {
      chainId: sourceChainId,
      name: sourceChain?.name ?? "",
      nativeCurrencySymbol: sourceChain?.nativeCurrencySymbol ?? "ETH",
    },
    route,
    amount: amountBigInt,
    ohmBalance,
    amountStatus,
    nativeBalance: nativeBalance?.value,
    nativeFee:
      isSafe && nativeFee !== undefined
        ? getSafeFee(nativeFee, destinationChainId).value
        : nativeFee,
    feeFailed: !!feeError,
    hasSufficientAllowance,
    isSafe,
    isSafeApp,
    walletUnknown: walletKind === "unknown",
    needsRecipient,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = clampOhmDecimals(handleInputNumberChange(e.target.value));
    const next = cleaned.slice(0, 20);
    onAmountChange(next);
    return next;
  };

  const handleMax = () => {
    if (ohmToken.balance) {
      onAmountChange(formatUnits(ohmToken.balance, OHM_DECIMALS));
    }
  };

  const formattedFee = nativeFee == null ? undefined : formatUnits(nativeFee, 18);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (cta.action === "switch") onSwitchNetwork();
          else if (cta.action === "confirm") onSubmit();
        }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-y-4 relative">
          {/* From Section */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <ChainInputSection
                  label="From"
                  chain={sourceChain}
                  onChainClick={isSafeApp ? undefined : onOpenSourceChainModal}
                  amount={field.value}
                  onChange={(e) => {
                    field.onChange(handleChange(e));
                  }}
                  isInput
                  ohmToken={ohmToken}
                  address={address}
                  onMax={handleMax}
                />
              </FormItem>
            )}
          />

          {/* Swap Button */}
          <div className="flex justify-center z-10 absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-0">
            <button
              type="button"
              onClick={onSwapChains}
              disabled={!canSwap}
              className="group size-10 rounded-full bg-surface-tooltip border border-a5-b flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon
                name="swapIcon"
                className="size-4 text-secondary-t transition-transform group-hover:not-disabled:scale-110"
              />
            </button>
          </div>

          {/* To Section */}
          <ChainInputSection
            label="To"
            chain={destChain}
            onChainClick={onOpenDestChainModal}
            amount={amount}
            isInput={false}
          />
        </div>

        {/* Recipient Row */}
        <button
          type="button"
          onClick={onOpenSettingsModal}
          className="flex w-full items-center justify-between rounded-2xl bg-surface-a3 border border-a3-b px-4 py-3 transition-colors hover:bg-surface-a5"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-secondary-t">Recipient</span>
            {isCustomRecipient && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-blue rounded-full border border-blue/30 px-1.5 py-0.5">
                Custom
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-primary-t">
            <span>
              {recipientAddress ? shortenAddress(recipientAddress, 4) : "Connected wallet"}
            </span>
            <Settings className="h-3.5 w-3.5 text-secondary-t" />
          </div>
        </button>

        {/* Route state */}
        {route.status === "unavailable" && (
          <Alert variant="compact" type="warning" size="sm" className="w-full">
            <RiInformationLine size={16} />
            <AlertDescription className="text-xs font-semibold text-primary-t">
              {ROUTE_UNAVAILABLE_COPY[route.reason]}
            </AlertDescription>
          </Alert>
        )}

        {needsRecipient && amountBigInt > 0n && (
          <Alert variant="compact" type="warning" size="sm" className="w-full">
            <RiInformationLine size={16} />
            <AlertDescription className="text-xs font-semibold text-primary-t">
              This wallet isn't deployed on {destChain?.name}. Enter a recipient you control there.
            </AlertDescription>
          </Alert>
        )}

        {/* Contract wallets may not exist at the same address on the destination */}
        {isContractWallet && !isCustomRecipient && !needsRecipient && (
          <Alert variant="compact" type="warning" size="sm" className="w-full">
            <RiInformationLine size={16} />
            <AlertDescription className="text-xs font-semibold text-primary-t">
              You're using a contract wallet. Check that you control this address on{" "}
              {destChain?.name}, or set a different recipient.
            </AlertDescription>
          </Alert>
        )}

        {/* Near rate-limit warning */}
        {address && amountStatus === "near-limit" && (
          <Alert variant="compact" type="warning" size="sm" className="w-full">
            <RiInformationLine size={16} />
            <AlertDescription className="text-xs font-semibold text-primary-t">
              This amount is close to the route's daily limit. If capacity runs out first, delivery
              can be delayed. Consider sending less.
            </AlertDescription>
          </Alert>
        )}

        {/* Allowance note */}
        {address && amountBigInt > 0n && !hasSufficientAllowance && !isSafe && (
          <Alert variant="compact" type="info" size="sm" className="w-full">
            <RiInformationLine size={16} />
            <AlertDescription className="text-xs font-semibold text-primary-t">
              Allowance is below requested amount.
            </AlertDescription>
          </Alert>
        )}

        {/* CTA Button */}
        <Button type="submit" className="w-full" disabled={cta.disabled}>
          {cta.label}
        </Button>

        {/* Info Text */}
        <p className="text-xs text-tertiary-t text-center">
          OHM is locked on Ethereum and burned on other chains, then released or minted on the
          destination. Delivery can take a while, so track it in your history. Powered by Chainlink
          CCIP.
        </p>

        {/* Fees Row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-secondary-t">Estimated Bridge Fee</span>
          {formattedFee != null ? (
            <div className="flex items-center gap-x-1">
              {sourceChain && <ChainIcon size={16} chainId={sourceChain.chainId} />}
              <NumberFlow
                value={formattedFee}
                format={{ style: "decimal", maximumFractionDigits: 6 }}
              />
            </div>
          ) : (
            <span className="text-xs font-medium text-primary-t">{isFeeLoading ? "…" : "N/A"}</span>
          )}
        </div>
      </form>
    </Form>
  );
}

/** Reusable chain input section for From/To */
function ChainInputSection({
  label,
  chain,
  onChainClick,
  amount,
  onChange,
  isInput,
  ohmToken,
  address,
  onMax,
}: {
  label: string;
  chain?: BridgeChain;
  onChainClick?: () => void;
  amount: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isInput?: boolean;
  ohmToken?: { balance?: bigint; decimals: number; price?: number };
  address?: string;
  onMax?: () => void;
}) {
  const displayAmount = amount || "0.00";
  const usdValue = amount ? Number(amount) * (ohmToken?.price ?? 0) : 0;

  return (
    <div className="rounded-2xl overflow-hidden gap-0.5 flex flex-col">
      {/* Chain Selector Row */}
      <button
        type="button"
        disabled={!onChainClick}
        onClick={onChainClick}
        className="flex w-full items-center gap-2 bg-surface-a5 border border-a3-b rounded-t-2xl px-4 py-3 hover:bg-surface-a10 transition-colors cursor-pointer"
      >
        {chain && <ChainIcon chainId={chain.chainId} size={32} />}
        <div className="flex flex-col items-start">
          <span className="text-[15px]/[20px] font-semibold text-primary-t">{label}</span>
          <span className="text-sm text-secondary-t font-normal">{chain?.name}</span>
        </div>
        <div className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-tooltip">
          <ChevronDownIcon className="h-5 w-5 text-primary-t" />
        </div>
      </button>

      {/* Amount + Token Section */}
      <div className="group/bridgeinput p-4 space-y-3 bg-surface-a3 border border-a3-b rounded-b-2xl transition-colors hover:border-a10-b focus-within:bg-transparent focus-within:border-a20-b">
        <div className="flex items-center justify-between gap-3">
          {isInput ? (
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={onChange}
              maxLength={20}
              className="caret-primary-t text-[32px]/[40px] bg-transparent placeholder:text-disabled-t min-w-0 flex-1 pr-1.5 font-semibold outline-none"
            />
          ) : (
            <span className="text-[32px]/[40px] font-semibold text-disabled-t">
              {displayAmount}
            </span>
          )}
          <div className="bg-surface-a3 border border-a3-b inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2">
            <Icon name="OHMTokenIcon" className="size-5" />
            <span className="text-[15px]/[20px] font-semibold whitespace-nowrap">OHM</span>
          </div>
        </div>

        {/* Footer: USD Value + Balance */}
        {isInput && (
          <div className="flex items-center gap-2">
            <NumberFlow className="text-secondary-t flex-1 text-xs font-normal" value={usdValue} />
            <div className="inline-flex items-center gap-1 text-xs font-normal">
              <span className="text-secondary-t">Available:</span>
              {address && ohmToken?.balance != null ? (
                <NumberFlow
                  className="font-semibold text-primary-t"
                  value={formatTokenAmount(ohmToken.balance, ohmToken.decimals)}
                  format={{
                    style: "decimal",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4,
                  }}
                />
              ) : (
                <span className="text-sm font-medium">N/A</span>
              )}
            </div>
            <Button disabled={!address} size="xs" variant="secondary" type="button" onClick={onMax}>
              Max
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
