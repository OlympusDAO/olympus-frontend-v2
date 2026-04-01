import type * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { RiInformationFill } from "@remixicon/react";
import * as dn from "dnum";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { NumberFlow } from "@/components/ui/number-flow";
import { useFormContext } from "react-hook-form";
import { FormControl, FormMessage } from "@/components/ui/form";
import { Tooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleInputNumberChange } from "@/lib/helpers";
import type { TokenWithBalance } from "@/lib/hooks/useToken";

type TokenBigInputProps = Omit<React.ComponentProps<"input">, "onChange"> & {
  label?: React.ReactNode;
  required?: boolean;
  tooltip?: string;
  balanceLabel?: string;
  headerRight?: React.ReactNode;
  onChange?: (value: string, e?: React.ChangeEvent<HTMLInputElement>) => void;
  onMax?: () => void;
  token: TokenWithBalance;
  tokenSelector?: {
    tokens: Array<TokenWithBalance>;
    selectedToken: TokenWithBalance;
    onTokenChange: (token: TokenWithBalance) => void;
  };
};

function TokenBigInput({
  label,
  required = false,
  tooltip,
  balanceLabel = "Balance:",
  headerRight,
  onChange,
  onMax,
  token,
  tokenSelector,
  ...rest
}: TokenBigInputProps) {
  const { address } = useAccount();
  const formContext = useFormContext();
  const hasFormContext = formContext !== null;
  const isDisabled = rest.disabled;
  const { balance = 0n, decimals, icon, symbol } = token;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanedValue = handleInputNumberChange(e.target.value);
    const limitedValue = cleanedValue.slice(0, 20);
    onChange?.(limitedValue, e);
  };

  const handleMax = () => {
    if (onMax) {
      onMax();
    } else if (balance && onChange) {
      onChange(formatUnits(balance, decimals));
    }
  };

  const calculateFontSize = (value: string = "") => {
    const length = Math.min(value.length, 20);
    if (length <= 11) return 32;
    const steps = [30, 28, 26, 24, 22, 20, 19, 18, 17];
    return steps[length - 12] ?? 20;
  };

  const fullValue = (rest.value as string) || "";
  const displayValue = fullValue.slice(0, 20);
  const fontSize = calculateFontSize(displayValue);
  const lineHeight = Math.ceil(fontSize * 1.25);

  const content = (
    <div
      data-slot="token-big-input"
      className="group/biginput flex flex-col gap-3 rounded-2xl bg-surface-a3 px-4 py-4 border border-a3-b transition-colors hover:bg-surface-a10"
    >
      {/* Header row */}
      {(label || headerRight) && (
        <div className="flex items-center justify-between">
          {!!label && (
            <div className="flex items-center gap-1.5">
              {typeof label === "string" ? (
                <p
                  className={cn("text-[15px]/[20px] font-medium", isDisabled && "text-disabled-t")}
                >
                  {label}
                </p>
              ) : (
                label
              )}
              {required && <p className="text-green text-sm font-medium">*</p>}
              {!!tooltip && (
                <Tooltip title={tooltip}>
                  <RiInformationFill
                    size={16}
                    className="text-tertiary-t hover:text-secondary-t cursor-pointer transition-colors"
                  />
                </Tooltip>
              )}
            </div>
          )}
          {headerRight}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-[8px]">
        <input
          placeholder="0.00"
          className={cn(
            "caret-primary-t text-[32px]/[40px] bg-transparent placeholder:text-disabled-t group-aria-invalid/biginput:text-red group-aria-invalid/biginput:text-shadow-none group-aria-invalid/biginput:bg-transparent w-full pr-1.5 font-semibold outline-none",
            rest.value && "bg-transparent",
            isDisabled && "caret-disabled-t cursor-not-allowed",
          )}
          style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px` }}
          maxLength={20}
          {...rest}
          {...(rest.value !== undefined ? { value: displayValue } : {})}
          onChange={handleChange}
        />

        {tokenSelector ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="bg-surface-a5 hover:bg-surface-a10 inline-flex shrink-0 cursor-pointer items-center gap-[8px] rounded-full px-[12px] py-[8px] text-sm font-medium whitespace-nowrap transition-colors">
              <Icon name={tokenSelector.selectedToken.icon} className="size-[20px] !rotate-0" />
              <span>{tokenSelector.selectedToken.symbol}</span>
              <ChevronDownIcon className="text-secondary-t size-[16px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {tokenSelector.tokens.map((t) => (
                <DropdownMenuItem key={t.address} onClick={() => tokenSelector.onTokenChange(t)}>
                  <Icon name={t.icon} className="size-[20px] !rotate-0" />
                  {t.symbol}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="bg-surface-a3 border border-a3-b inline-flex shrink-0 items-center gap-[8px] rounded-full px-[12px] py-[8px]">
            <Icon name={icon} className="size-[20px] !rotate-0" />
            <p className="text-[15px]/[20px] font-semibold whitespace-nowrap">{symbol}</p>
          </div>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center gap-[8px]">
        <NumberFlow
          className={cn(
            "text-secondary-t flex-1 text-xs font-normal",
            isDisabled && "text-disabled-t",
          )}
          value={+(rest.value || 0) * (token.price || 0)}
          format={{ notation: "standard", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
        />
        <div className="inline-flex items-center gap-[4px] text-xs font-normal">
          <p className={cn("text-secondary-t", isDisabled && "text-disabled-t")}>{balanceLabel}</p>
          {address ? (
            <NumberFlow
              className={cn("font-medium text-primary-t", isDisabled && "text-disabled-t")}
              value={dn.toNumber([balance, decimals])}
              format={{
                style: "decimal",
                minimumFractionDigits: 0,
                maximumFractionDigits: Math.max(2, Math.min(6, decimals)),
              }}
            />
          ) : (
            <p className="text-xs font-medium">N/A</p>
          )}
        </div>
        <Button
          disabled={isDisabled}
          size="xs"
          variant="secondary"
          type="button"
          onClick={handleMax}
        >
          Max
        </Button>
      </div>

      {hasFormContext && <FormMessage />}
    </div>
  );

  if (hasFormContext) {
    return <FormControl>{content}</FormControl>;
  }

  return content;
}

export { TokenBigInput };
