import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button.tsx";
import { Form, FormField, FormItem } from "@/components/ui/form.tsx";
import { TokenBigInput } from "@/components/ui/token-big-input.tsx";
import { useAccount } from "wagmi";
import { TokenName } from "@/lib/tokens.ts";
import { useToken, type TokenWithBalance } from "@/lib/hooks/useToken.tsx";
import { parseTokenAmount } from "@/lib/utils/token-amount";
import { SOURCE_TOKENS, WRAP_FLOWS, getWrapFlow, type WrapMode } from "./wrap-flows";

interface WrapFormProps {
  mode: WrapMode;
  sourceToken: TokenName;
  onSourceTokenChange: (token: TokenName) => void;
  inputAmount: string;
  onInputAmountChange: (amount: string) => void;
  outputAmount: string;
  onSubmit: () => void;
}

/** Tokens the Wrap page can show. Prices: sOHM is redeemable 1:1 for OHM, so it shares OHM's price. */
type WrapPageToken = TokenName.OHM | TokenName.SOHM | TokenName.GOHM;

export function WrapForm({
  mode,
  sourceToken,
  onSourceTokenChange,
  inputAmount,
  onInputAmountChange,
  outputAmount,
  onSubmit,
}: WrapFormProps) {
  const { address } = useAccount();
  const flow = getWrapFlow(mode, sourceToken);
  const { output: outputTokenName, copy } = WRAP_FLOWS[flow];

  const OHMToken = useToken(TokenName.OHM);
  const GOHMToken = useToken(TokenName.GOHM);

  const ohmBase = useToken(TokenName.OHM, address);
  const sohmBase = useToken(TokenName.SOHM, address);
  const gohmBase = useToken(TokenName.GOHM, address);

  const tokensByName = useMemo<Record<WrapPageToken, TokenWithBalance>>(
    () => ({
      [TokenName.OHM]: { ...ohmBase, price: OHMToken.price },
      [TokenName.SOHM]: { ...sohmBase, price: OHMToken.price },
      [TokenName.GOHM]: { ...gohmBase, price: GOHMToken.price },
    }),
    [ohmBase, sohmBase, gohmBase, OHMToken.price, GOHMToken.price],
  );

  const inputToken = tokensByName[sourceToken as WrapPageToken];
  const outputToken = tokensByName[outputTokenName as WrapPageToken];
  const sourceNames = SOURCE_TOKENS[mode] as readonly WrapPageToken[];
  const sourceOptions = sourceNames.map((name) => tokensByName[name]);

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

  const hasInsufficientBalance = useMemo(() => {
    if (!inputAmount || !inputToken.balance) return false;
    return parseTokenAmount(inputAmount, inputToken.decimals) > inputToken.balance;
  }, [inputAmount, inputToken.balance, inputToken.decimals]);

  const buttonState = useMemo(() => {
    if (!address) return { disabled: true, label: "Connect Wallet" };
    if (!inputAmount || parseFloat(inputAmount) === 0)
      return { disabled: true, label: "Enter Amount" };
    if (hasInsufficientBalance) return { disabled: true, label: "Insufficient Balance" };
    return { disabled: false, label: copy.action };
  }, [address, inputAmount, hasInsufficientBalance, copy.action]);

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
                  label={copy.inputLabel}
                  token={inputToken}
                  tokenSelector={{
                    tokens: sourceOptions,
                    selectedToken: inputToken,
                    onTokenChange: (token) => {
                      const name = sourceNames.find((n) => tokensByName[n].symbol === token.symbol);
                      if (name) onSourceTokenChange(name);
                    },
                  }}
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
