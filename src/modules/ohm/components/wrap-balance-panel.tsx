import { Icon } from "@/components/icon";
import { Separator } from "@/components/ui/separator";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import { TokenName, getTokenAddress, TOKENS } from "@/lib/tokens";
import { useAccount, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="rounded-2xl bg-surface-a3 px-4 py-4 border border-a3-b space-y-3">
      <h3 className="font-medium">My Balances</h3>

      <div className="space-y-3 text-sm">
        <BalanceRow
          icon="OHMColorTokenIcon"
          symbol="OHM"
          label="OHM Balance"
          before={ohmBalanceNum.toFixed(2)}
          after={showAfter ? afterOhm : undefined}
          decimals={2}
        />
        <Separator />
        <BalanceRow
          icon="GOHMColorTokenIcon"
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
  icon: "OHMColorTokenIcon" | "GOHMColorTokenIcon";
  symbol: string;
  label: string;
  before: string;
  after?: number;
  decimals: number;
}) {
  const isNegative = after != null && after < 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-secondary-t">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Icon name={icon} size={16} />
        <span className="font-semibold text-primary-t">
          {before} {symbol}
        </span>
        {after != null && (
          <>
            <ArrowRight className="w-3 h-3 text-secondary-t" />
            <Icon name={icon} size={16} />
            <span className={cn("font-semibold text-primary-t", isNegative && "text-red")}>
              {after.toFixed(decimals)} {symbol}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
