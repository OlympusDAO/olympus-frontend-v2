import { Fragment } from "react";
import { Icon } from "@/components/icon";
import { Separator } from "@/components/ui/separator";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import { TokenName, getTokenAddress, TOKENS } from "@/lib/tokens";
import { useAccount, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { RiArrowRightLine } from "@remixicon/react";
import { FLOW_INPUT_TOKEN, FLOW_OUTPUT_TOKEN, type WrapFlow } from "./wrap-flows";

interface BalancePanelProps {
  flow: WrapFlow;
  inputAmount: string;
  outputAmount: string;
}

export function WrapBalancePanel({ flow, inputAmount, outputAmount }: BalancePanelProps) {
  const { address } = useAccount();
  const chainId = useChainId();

  const ohmAddress = getTokenAddress(TokenName.OHM, chainId);
  const sohmAddress = getTokenAddress(TokenName.SOHM, chainId);
  const gohmAddress = getTokenAddress(TokenName.GOHM, chainId);

  const { balance: ohmBalance } = useTokenBalance(ohmAddress, address);
  const { balance: sohmBalance } = useTokenBalance(sohmAddress, address);
  const { balance: gohmBalance } = useTokenBalance(gohmAddress, address);

  const balances: Record<string, number> = {
    [TokenName.OHM]:
      ohmBalance != null ? parseFloat(formatUnits(ohmBalance, TOKENS.OHM.decimals)) : 0,
    [TokenName.SOHM]:
      sohmBalance != null ? parseFloat(formatUnits(sohmBalance, TOKENS.SOHM.decimals)) : 0,
    [TokenName.GOHM]:
      gohmBalance != null ? parseFloat(formatUnits(gohmBalance, TOKENS.GOHM.decimals)) : 0,
  };

  const inputNum = parseFloat(inputAmount) || 0;
  const outputNum = parseFloat(outputAmount) || 0;
  const showAfter = inputNum > 0;

  const inputTokenName = FLOW_INPUT_TOKEN[flow];
  const outputTokenName = FLOW_OUTPUT_TOKEN[flow];

  // Compute after-balances (no clamping — show theoretical values)
  const afterFor = (name: TokenName) => {
    if (name === inputTokenName) return balances[name] - inputNum;
    if (name === outputTokenName) return balances[name] + outputNum;
    return balances[name];
  };

  // sOHM is a legacy position for most users — only surface its row when it's part of
  // the active flow or the wallet actually holds some.
  const rows = [TokenName.OHM, TokenName.GOHM, TokenName.SOHM].filter(
    (name) =>
      name !== TokenName.SOHM || inputTokenName === TokenName.SOHM || balances[TokenName.SOHM] > 0,
  );

  return (
    <div className="rounded-2xl bg-surface-a3 px-4 py-4 border border-a3-b">
      <h3 className="mb-4 text-[14px]/[20px] font-semibold text-primary-t">My Balances</h3>

      <div>
        {rows.map((name, i) => {
          const { symbol, icon, decimals } = TOKENS[name];
          const displayDecimals = decimals === 18 ? 4 : 2;
          return (
            <Fragment key={name}>
              {i > 0 && <Separator className="my-2" />}
              <BalanceRow
                icon={icon as "OHMTokenIcon" | "GOHMTokenIcon"}
                symbol={symbol}
                label={`${symbol} Balance`}
                before={balances[name].toFixed(displayDecimals)}
                after={showAfter ? afterFor(name) : undefined}
                decimals={displayDecimals}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function BalanceRow({
  icon,
  symbol,
  label,
  before,
  after,
  decimals,
}: {
  icon: "OHMTokenIcon" | "GOHMTokenIcon";
  symbol: string;
  label: string;
  before: string;
  after?: number;
  decimals: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px]/[16px] font-normal text-secondary-t">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Icon name={icon} size={16} />
          <span className="text-[12px]/[16px] font-semibold text-primary-t">
            {before} {symbol}
          </span>
        </div>
        {after != null && (
          <>
            <RiArrowRightLine className="size-4 text-tertiary-t" />
            <div className="flex items-center gap-1">
              <Icon name={icon} size={16} />
              <span className="text-[12px]/[16px] font-semibold text-primary-t">
                {after.toFixed(decimals)} {symbol}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
