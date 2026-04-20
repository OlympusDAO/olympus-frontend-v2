import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useAllTokenBalances } from "@/lib/hooks/useAllTokenBalances";
import { TokenName, TOKENS } from "@/lib/tokens";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useMockData } from "@/lib/mock/provider";
import { BalanceInfoCards } from "../components/balance-info-cards.tsx";
import { BalanceWalletValue } from "../components/balance-wallet-value.tsx";
import { BalanceTable } from "../components/balance-table";
import { BalanceCards } from "../components/balance-cards";
import { BalanceEmptyState } from "../components/balance-empty-state.tsx";
import { BalanceDisconnectedState } from "../components/balance-disconnected-state.tsx";
import type { IconName } from "@/components/icon";
import { useToken } from "@/lib/hooks/useToken.tsx";

export function BalancesPage() {
  const { isConnected } = useAccount();
  const { isMobile } = useIsMobile();
  const mock = useMockData();

  // In mock mode, override connection state
  const effectivelyConnected = mock ? mock.scenario.isConnected : isConnected;

  // Prices
  // const { price: ohmPriceBigInt, isLoading: ohmPriceLoading } = useOhmPrice();
  // const { price: gohmPriceNum, isLoading: gohmPriceLoading } = useGohmPrice();
  const GOHMToken = useToken(TokenName.GOHM);
  const OHMToken = useToken(TokenName.OHM);

  const ohmPriceNum = OHMToken.price;
  const gohmPriceNum = GOHMToken.price;

  const tokenList = useMemo(
    () => [TOKENS.OHM, TOKENS.SOHM, TOKENS.GOHM, TOKENS.WSOHM, TOKENS.V1_OHM, TOKENS.V1_SOHM],
    [],
  );
  const { balances: tokenBalances, isLoading: balancesLoading } = useAllTokenBalances(tokenList);

  const ohmBalances = tokenBalances["OHM"];
  const sohmBalances = tokenBalances["sOHM"];
  const gohmBalances = tokenBalances["gOHM"];
  const wsohmBalances = tokenBalances["wsOHM"];
  const v1OhmBalances = tokenBalances["OHM v1"];
  const v1SohmBalances = tokenBalances["sOHM v1"];

  const isLoading = balancesLoading;

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

  const hasBalances =
    totalUsd >= 0.01 ||
    [ohmBalances, sohmBalances, gohmBalances, wsohmBalances, v1OhmBalances, v1SohmBalances].some(
      (b) => b.totalBalance > 0n,
    );

  // Build token entries for the table
  const tokens = useMemo(
    () => [
      {
        symbol: "OHM",
        label: "OHM",
        icon: "OHMColorTokenIcon" as IconName,
        balances: ohmBalances,
        price: ohmPriceNum,
      },
      {
        symbol: "sOHM",
        label: "sOHM",
        sublabel: "Staked OHM",
        icon: "OHMColorTokenIcon" as IconName,
        balances: sohmBalances,
        price: ohmPriceNum,
      },
      {
        symbol: "gOHM",
        label: "gOHM",
        sublabel: "Governance OHM",
        icon: "GOHMColorTokenIcon" as IconName,
        balances: gohmBalances,
        price: gohmPriceNum,
      },
      {
        symbol: "wsOHM",
        label: "wsOHM",
        sublabel: "Wrapped sOHM (legacy)",
        icon: "GOHMColorTokenIcon" as IconName,
        balances: wsohmBalances,
        price: gohmPriceNum,
      },
      {
        symbol: "OHM v1",
        label: "OHM v1",
        sublabel: "Legacy",
        icon: "OHMColorTokenIcon" as IconName,
        balances: v1OhmBalances,
        price: ohmPriceNum,
      },
      {
        symbol: "sOHM v1",
        label: "sOHM v1",
        sublabel: "Legacy",
        icon: "OHMColorTokenIcon" as IconName,
        balances: v1SohmBalances,
        price: ohmPriceNum,
      },
    ],
    [
      ohmBalances,
      sohmBalances,
      gohmBalances,
      wsohmBalances,
      v1OhmBalances,
      v1SohmBalances,
      ohmPriceNum,
      gohmPriceNum,
    ],
  );

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
