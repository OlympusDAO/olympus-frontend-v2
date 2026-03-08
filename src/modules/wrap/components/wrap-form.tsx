import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { TokenBigInput } from "@/components/ui/token-big-input";
import { useAccount } from "wagmi";
import { useOhmPrice } from "@/lib/hooks/useOhmPrice";
import { useGohmPrice } from "@/lib/hooks/useGohmPrice";
import { TokenName } from "@/lib/tokens";
import { useToken } from "@/lib/hooks/useToken";
import { parseUnits, parseEther } from "viem";

interface WrapFormProps {
  mode: "wrap" | "unwrap";
  inputAmount: string;
  onInputAmountChange: (amount: string) => void;
  outputAmount: string;
  onSubmit: () => void;
}

export function WrapForm({
  mode,
  inputAmount,
  onInputAmountChange,
  outputAmount,
  onSubmit,
}: WrapFormProps) {
  const { address } = useAccount();
  const { formattedPrice: ohmPrice } = useOhmPrice();
  const { formattedPrice: gohmPrice } = useGohmPrice();

  const inputTokenName = mode === "wrap" ? TokenName.OHM : TokenName.GOHM;
  const outputTokenName = mode === "wrap" ? TokenName.GOHM : TokenName.OHM;

  const inputTokenBase = useToken(inputTokenName, address);
  const outputTokenBase = useToken(outputTokenName, address);

  // Enrich tokens with prices
  const inputToken = useMemo(
    () => ({
      ...inputTokenBase,
      price: mode === "wrap" ? parseFloat(ohmPrice) : parseFloat(gohmPrice),
    }),
    [inputTokenBase, ohmPrice, gohmPrice, mode],
  );

  const outputToken = useMemo(
    () => ({
      ...outputTokenBase,
      price: mode === "wrap" ? parseFloat(gohmPrice) : parseFloat(ohmPrice),
    }),
    [outputTokenBase, ohmPrice, gohmPrice, mode],
  );

  const form = useForm<{ inputAmount: string; outputAmount: string }>({
    defaultValues: { inputAmount: "", outputAmount: "" },
  });

  // Sync parent state → form
  useEffect(() => {
    form.setValue("inputAmount", inputAmount);
  }, [inputAmount, form]);

  useEffect(() => {
    form.setValue("outputAmount", outputAmount);
  }, [outputAmount, form]);

  // Check insufficient balance
  const hasInsufficientBalance = useMemo(() => {
    if (!inputAmount || !inputToken.balance) return false;
    try {
      const amountBigInt =
        inputToken.decimals === 18
          ? parseEther(inputAmount)
          : parseUnits(inputAmount, inputToken.decimals);
      return amountBigInt > inputToken.balance;
    } catch {
      return false;
    }
  }, [inputAmount, inputToken.balance, inputToken.decimals]);

  // Button state
  const buttonState = useMemo(() => {
    if (!address) return { disabled: true, label: "Connect Wallet" };
    if (!inputAmount || parseFloat(inputAmount) === 0)
      return { disabled: true, label: "Enter Amount" };
    if (hasInsufficientBalance) return { disabled: true, label: "Insufficient Balance" };
    return {
      disabled: false,
      label: mode === "wrap" ? "Wrap OHM to gOHM" : "Unwrap gOHM",
    };
  }, [address, inputAmount, hasInsufficientBalance, mode]);

  return (
    <div>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="inputAmount"
            render={({ field }) => (
              <FormItem>
                <TokenBigInput
                  label={mode === "wrap" ? "Wrap" : "Unwrap"}
                  token={inputToken}
                  value={field.value}
                  onChange={(val) => {
                    field.onChange(val);
                    onInputAmountChange(val as string);
                  }}
                />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="outputAmount"
            render={({ field }) => (
              <FormItem>
                <TokenBigInput
                  label="Receive"
                  token={outputToken}
                  value={field.value}
                  disabled
                  balanceLabel="Available:"
                />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={buttonState.disabled}>
            {buttonState.label}
          </Button>
        </form>
      </Form>
    </div>
  );
}
