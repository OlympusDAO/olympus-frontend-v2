import { useMemo } from "react";
import { ChevronDownIcon, ArrowUpDown, Settings, AlertTriangle } from "lucide-react";
import { parseUnits, formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { Icon } from "@/components/icon.tsx";
import { Button } from "@/components/ui/button.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance.tsx";
import { TokenName, getTokenAddress } from "@/lib/tokens.ts";
import { ContractName, getContractAddress } from "@/lib/contracts.ts";
import { handleInputNumberChange } from "@/lib/helpers.ts";
import { useEstimateBridgeFee } from "@/lib/hooks/bridge/useEstimateBridgeFee.ts";
import { useBridgeActive } from "@/lib/hooks/bridge/useBridgeActive.ts";
import { getBridgeChain, BRIDGEABLE_DESTINATIONS, type BridgeChain } from "../utils/constants.ts";

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
  onSubmit,
}: BridgeFormProps) {
  const { address } = useAccount();

  const sourceChain = getBridgeChain(sourceChainId);
  const destChain = getBridgeChain(destinationChainId);

  // OHM balance on source chain (wallet should be on source chain)
  const ohmToken = useToken(TokenName.OHM, address);

  // Native balance for fee validation
  const { data: nativeBalance } = useBalance({
    address,
    chainId: sourceChainId,
  });

  // Parse amount to bigint
  const amountBigInt = useMemo(() => {
    try {
      return amount ? parseUnits(amount, 9) : 0n;
    } catch {
      return 0n;
    }
  }, [amount]);

  // Approval check — OHM must be approved to the Minter contract
  const ohmAddress = getTokenAddress(TokenName.OHM, sourceChainId);
  const minterAddress = getContractAddress(ContractName.CROSS_CHAIN_MINTER, sourceChainId);
  const { allowance } = useTokenAllowance(ohmAddress!, address, minterAddress);

  const hasSufficientAllowance =
    allowance != null && amountBigInt > 0n && allowance >= amountBigInt;

  // Fee estimation
  const { nativeFee, isLoading: isFeeLoading } = useEstimateBridgeFee({
    sourceChainId,
    destinationChainId,
    recipientAddress,
    amount: amountBigInt,
  });

  // Bridge active check
  const { isActive: isBridgeActive } = useBridgeActive(sourceChainId);

  // Insufficient balance checks
  const hasInsufficientOhm = useMemo(() => {
    if (!amount || !ohmToken.balance) return false;
    return amountBigInt > ohmToken.balance;
  }, [amount, ohmToken.balance, amountBigInt]);

  const hasInsufficientNative = useMemo(() => {
    if (!nativeFee || !nativeBalance) return false;
    return nativeBalance.value < nativeFee;
  }, [nativeFee, nativeBalance]);

  // Can swap chains?
  const canSwap = useMemo(() => {
    const destRoutes = BRIDGEABLE_DESTINATIONS[destinationChainId];
    return destRoutes?.includes(sourceChainId) ?? false;
  }, [sourceChainId, destinationChainId]);

  // Button state
  const buttonState = useMemo(() => {
    if (!address) return { disabled: true, label: "Connect Wallet" };
    if (isBridgeActive === false) return { disabled: true, label: "Bridge Inactive" };
    if (!amount || parseFloat(amount) === 0) return { disabled: true, label: "Enter Amount" };
    if (hasInsufficientOhm) return { disabled: true, label: "Insufficient OHM Balance" };
    if (!hasSufficientAllowance) return { disabled: false, label: "Approve OHM for Bridging" };
    if (hasInsufficientNative)
      return {
        disabled: true,
        label: `Insufficient ${sourceChain?.nativeCurrencySymbol} for Fees`,
      };
    return { disabled: false, label: "Bridge OHM" };
  }, [
    address,
    amount,
    hasInsufficientOhm,
    hasSufficientAllowance,
    hasInsufficientNative,
    isBridgeActive,
    sourceChain,
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = handleInputNumberChange(e.target.value);
    onAmountChange(cleaned.slice(0, 20));
  };

  const handleMax = () => {
    if (ohmToken.balance) {
      onAmountChange(formatUnits(ohmToken.balance, 9));
    }
  };

  const formattedFee = nativeFee ? formatUnits(nativeFee, 18) : undefined;
  const displayFee = formattedFee
    ? `${Number(formattedFee).toFixed(6)} ${sourceChain?.nativeCurrencySymbol ?? "ETH"}`
    : "N/A";

  return (
    <div className="space-y-4">
      {/* From Section */}
      <ChainInputSection
        label="From"
        chain={sourceChain}
        onChainClick={onOpenSourceChainModal}
        amount={amount}
        onChange={handleChange}
        isInput
        ohmToken={ohmToken}
        address={address}
        onMax={handleMax}
      />

      {/* Swap Button */}
      <div className="flex justify-center -my-4 relative z-10">
        <button
          type="button"
          onClick={onSwapChains}
          disabled={!canSwap}
          className="w-11 h-11 rounded-full bg-surface-a10 border border-a10-b flex items-center justify-center hover:bg-surface-a20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUpDown className="h-4 w-4 text-secondary-t" />
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

      {/* Warning Banner */}
      {address && amountBigInt > 0n && !hasSufficientAllowance && (
        <div className="flex items-center gap-2 rounded-xl bg-surface-a3 border border-a3-b p-3">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
          <p className="text-sm text-secondary-t">Allowance is below requested amount.</p>
        </div>
      )}

      {/* CTA Button */}
      <Button type="button" className="w-full" disabled={buttonState.disabled} onClick={onSubmit}>
        {buttonState.label}
      </Button>

      {/* Info Text */}
      <p className="text-xs text-tertiary-t text-center">
        When bridging OHM, the OHM on the sending chain gets burned and new OHM gets minted on the
        other side. Bridge in peace OHMie.
      </p>

      {/* Fees + Settings Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-secondary-t">Base Bridge Fees</span>
          <button
            type="button"
            onClick={onOpenSettingsModal}
            className="text-secondary-t hover:text-primary-t transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-xs font-medium text-primary-t">
          {isFeeLoading ? "..." : displayFee}
        </span>
      </div>
    </div>
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
        onClick={onChainClick}
        className="flex w-full items-center gap-3 bg-surface-a5 border border-surface-a3 rounded-t-2xl px-4 py-3 hover:bg-surface-a10 transition-colors cursor-pointer"
      >
        {chain && (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-a10">
            <Icon name={chain.icon} size={28} />
          </div>
        )}
        <div className="flex flex-col items-start">
          <span className="text-base font-semibold text-primary-t">{label}</span>
          <span className="text-sm text-secondary-t">{chain?.name}</span>
        </div>
        <div className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-a10">
          <ChevronDownIcon className="h-5 w-5 text-secondary-t" />
        </div>
      </button>

      {/* Amount + Token Section */}
      <div className="px-4 py-4 space-y-3 bg-surface-a3 border border-a3-b rounded-b-2xl">
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
          <div className="bg-surface-a10 border border-a10-b inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2">
            <Icon name="OHMColorTokenIcon" className="size-5 !rotate-0" />
            <span className="text-[15px]/[20px] font-semibold whitespace-nowrap">OHM</span>
          </div>
        </div>

        {/* Footer: USD Value + Balance */}
        {isInput && (
          <div className="flex items-center gap-2">
            <NumberFlow
              className="text-secondary-t flex-1 text-sm font-normal"
              value={usdValue}
              format={{
                notation: "standard",
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }}
            />
            <div className="inline-flex items-center gap-1 text-sm font-normal">
              <span className="text-secondary-t">Available:</span>
              {address && ohmToken?.balance != null ? (
                <NumberFlow
                  className="font-semibold text-primary-t"
                  value={Number(formatUnits(ohmToken.balance, ohmToken.decimals))}
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
