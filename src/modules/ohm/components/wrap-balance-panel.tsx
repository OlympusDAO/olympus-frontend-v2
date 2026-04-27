import { Icon } from "@/components/icon";
import { Separator } from "@/components/ui/separator";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import { TokenName, getTokenAddress, TOKENS } from "@/lib/tokens";
import { useAccount, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { RiArrowRightLine } from "@remixicon/react";

interface BalancePanelProps {
  mode: "wrap" | "unwrap";
  inputAmount: string;
  outputAmount: string;
}

export function WrapBalancePanel({ mode, inputAmount, outputAmount }: BalancePanelProps) {
  const { address } = useAccount();
  const chainId = useChainId();

  const ohmAddress = getTokenAddress(TokenName.OHM, chainId);
  const gohmAddress = getTokenAddress(TokenName.GOHM, chainId);

  const { balance: ohmBalance } = useTokenBalance(ohmAddress, address);
  const { balance: gohmBalance } = useTokenBalance(gohmAddress, address);

  const ohmBalanceNum =
    ohmBalance != null ? parseFloat(formatUnits(ohmBalance, TOKENS.OHM.decimals)) : 0;
  const gohmBalanceNum =
    gohmBalance != null ? parseFloat(formatUnits(gohmBalance, TOKENS.GOHM.decimals)) : 0;

  const inputNum = parseFloat(inputAmount) || 0;
  const outputNum = parseFloat(outputAmount) || 0;

  // Compute after-balances (no clamping — show theoretical values)
  const afterOhm = mode === "wrap" ? ohmBalanceNum - inputNum : ohmBalanceNum + outputNum;
  const afterGohm = mode === "wrap" ? gohmBalanceNum + outputNum : gohmBalanceNum - inputNum;

  const showAfter = inputNum > 0;

  return (
    <div className="rounded-2xl bg-surface-a3 px-4 py-4 border border-a3-b">
      <h3 className="mb-4 text-[14px]/[20px] font-semibold text-primary-t">My Balances</h3>

      <div>
        <BalanceRow
          icon="OHMTokenIcon"
          symbol="OHM"
          label="OHM Balance"
          before={ohmBalanceNum.toFixed(2)}
          after={showAfter ? afterOhm : undefined}
          decimals={2}
        />
        <Separator className="my-2" />
        <BalanceRow
          icon="GOHMTokenIcon"
          symbol="gOHM"
          label="gOHM Balance"
          before={gohmBalanceNum.toFixed(4)}
          after={showAfter ? afterGohm : undefined}
          decimals={4}
        />
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
