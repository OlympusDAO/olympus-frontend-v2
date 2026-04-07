import { useAccount } from "wagmi";
import { useOhmPrice } from "@/lib/hooks/useOhmPrice";
import { useGohmPrice } from "@/lib/hooks/useGohmPrice";
import { useMultiChainBalance } from "@/lib/hooks/useMultiChainBalance";
import { TOKENS } from "@/lib/tokens";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useMockData } from "@/lib/mock/provider";
import { BalanceInfoCards } from "../components/balance-info-cards.tsx";
import { BalanceWalletValue } from "../components/balance-wallet-value.tsx";
import { BalanceTable } from "../components/balance-table";
import { BalanceCards } from "../components/balance-cards";
import { BalanceEmptyState } from "../components/balance-empty-state.tsx";
import { BalanceDisconnectedState } from "../components/balance-disconnected-state.tsx";
import { formatUnits } from "viem";
import type { IconName } from "@/components/icon";

export function BalancesPage() {
  const { isConnected } = useAccount();
  const { isMobile } = useIsMobile();
  const mock = useMockData();

  // In mock mode, override connection state
  const effectivelyConnected = mock ? mock.scenario.isConnected : isConnected;

  // Prices
  const { price: ohmPriceBigInt, isLoading: ohmPriceLoading } = useOhmPrice();
  const { price: gohmPriceNum, isLoading: gohmPriceLoading } = useGohmPrice();

  const ohmPriceNum = ohmPriceBigInt != null ? parseFloat(formatUnits(ohmPriceBigInt, 18)) : 0;

  // Balances for each token
  const ohmBalances = useMultiChainBalance(TOKENS.OHM);
  const sohmBalances = useMultiChainBalance(TOKENS.SOHM);
  const gohmBalances = useMultiChainBalance(TOKENS.GOHM);
  const wsohmBalances = useMultiChainBalance(TOKENS.WSOHM);
  const v1OhmBalances = useMultiChainBalance(TOKENS.V1_OHM);
  const v1SohmBalances = useMultiChainBalance(TOKENS.V1_SOHM);

  const allBalances = [
    ohmBalances,
    sohmBalances,
    gohmBalances,
    wsohmBalances,
    v1OhmBalances,
    v1SohmBalances,
  ];

  const isLoading = ohmPriceLoading || gohmPriceLoading || allBalances.some((b) => b.isLoading);

  // Compute total USD
  // OHM, sOHM, v1 OHM, v1 sOHM priced at ohmPriceNum
  // gOHM, wsOHM priced at gohmPriceNum
  const totalUsd =
    parseFloat(ohmBalances.formattedTotalBalance) * ohmPriceNum +
    parseFloat(sohmBalances.formattedTotalBalance) * ohmPriceNum +
    parseFloat(gohmBalances.formattedTotalBalance) * gohmPriceNum +
    parseFloat(wsohmBalances.formattedTotalBalance) * gohmPriceNum +
    parseFloat(v1OhmBalances.formattedTotalBalance) * ohmPriceNum +
    parseFloat(v1SohmBalances.formattedTotalBalance) * ohmPriceNum;

  const hasBalances = totalUsd >= 0.01 || allBalances.some((b) => b.totalBalance > 0n);

  // Build token entries for the table
  const tokens: {
    symbol: string;
    label: string;
    sublabel?: string;
    icon: IconName;
    balances: typeof ohmBalances;
    price: number;
  }[] = [
    {
      symbol: "OHM",
      label: "OHM",
      icon: "OHMColorTokenIcon",
      balances: ohmBalances,
      price: ohmPriceNum,
    },
    {
      symbol: "sOHM",
      label: "sOHM",
      sublabel: "Staked OHM",
      icon: "OHMColorTokenIcon",
      balances: sohmBalances,
      price: ohmPriceNum,
    },
    {
      symbol: "gOHM",
      label: "gOHM",
      sublabel: "Governance OHM",
      icon: "GOHMColorTokenIcon",
      balances: gohmBalances,
      price: gohmPriceNum,
    },
    {
      symbol: "wsOHM",
      label: "wsOHM",
      sublabel: "Wrapped sOHM (legacy)",
      icon: "GOHMColorTokenIcon",
      balances: wsohmBalances,
      price: gohmPriceNum,
    },
    {
      symbol: "OHM v1",
      label: "OHM v1",
      sublabel: "Legacy",
      icon: "OHMColorTokenIcon",
      balances: v1OhmBalances,
      price: ohmPriceNum,
    },
    {
      symbol: "sOHM v1",
      label: "sOHM v1",
      sublabel: "Legacy",
      icon: "OHMColorTokenIcon",
      balances: v1SohmBalances,
      price: ohmPriceNum,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl ">
      <BalanceInfoCards isMobile={isMobile} />

      <div className="mt-8">
        {!effectivelyConnected ? (
          <BalanceDisconnectedState />
        ) : (
          <>
            <BalanceWalletValue totalUsd={totalUsd} isLoading={isLoading} />
            {hasBalances ? (
              isMobile ? (
                <BalanceCards tokens={tokens} />
              ) : (
                <BalanceTable tokens={tokens} />
              )
            ) : (
              <BalanceEmptyState isLoading={isLoading} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
