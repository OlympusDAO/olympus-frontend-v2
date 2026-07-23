import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useAllTokenBalances } from "@/lib/hooks/useAllTokenBalances";
import { TokenName, TOKENS } from "@/lib/tokens";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useMockData } from "@/lib/mock/provider";
import { useMigrationClaim } from "@/lib/hooks/useMigrationClaim";
import { useV1MigrationInfo, useV1MigratorMerkleRoot } from "@/lib/hooks/useV1MigrationInfo";
import { MigrateOhmModal } from "@/components/migrate-ohm-modal";
import { UnstakeSohmV1Modal } from "@/components/unstake-sohm-v1-modal";
import { UnwrapWsohmModal } from "@/components/unwrap-wsohm-modal";
import type {
  MigrationAction,
  MigrationStatus,
} from "@/modules/ohm/components/migration-action.ts";
import { BalanceInfoCards } from "@/modules/ohm/components/balance-info-cards.tsx";
import { BalanceWalletValue } from "@/modules/ohm/components/balance-wallet-value.tsx";
import { BalanceTable } from "@/modules/ohm/components/balance-table";
import { BalanceCards } from "@/modules/ohm/components/balance-cards";
import { BalanceEmptyState } from "@/modules/ohm/components/balance-empty-state.tsx";
import { BalanceDisconnectedState } from "@/modules/ohm/components/balance-disconnected-state.tsx";
import type { IconName } from "@/components/icon";
import { useToken } from "@/lib/hooks/useToken.tsx";

export function BalancesPage() {
  const { isConnected } = useAccount();
  const { isMobile } = useIsMobile();
  const mock = useMockData();

  // In mock mode, override connection state
  const effectivelyConnected = mock ? mock.scenario.isConnected : isConnected;

  // OHM v1 → v2 migration eligibility for the connected wallet
  const [isMigrateOpen, setIsMigrateOpen] = useState(false);
  const [isUnstakeV1Open, setIsUnstakeV1Open] = useState(false);
  const [isUnwrapWsohmOpen, setIsUnwrapWsohmOpen] = useState(false);
  const {
    migrator,
    merkleRoot,
    hasMerkleRoot,
    isOnChainMerkleRootActive,
    isLoading: merkleRootLoading,
  } = useV1MigratorMerkleRoot();
  const { claim, isEligible, isLoading: claimLoading } = useMigrationClaim(merkleRoot);
  const {
    isEnabled: migratorEnabled,
    isActive: migratorActive,
    isClaimValid,
    remaining,
    isLoading: migrationInfoLoading,
  } = useV1MigrationInfo(claim, isOnChainMerkleRootActive);

  const migrationStatus: MigrationStatus | undefined = useMemo(() => {
    if (mock || !isConnected) return undefined;
    if (merkleRootLoading || claimLoading || migrationInfoLoading) return "loading";
    if (!hasMerkleRoot) return "not-live";
    if (!isOnChainMerkleRootActive) return "not-live";
    // Eligible = present in the snapshot AND not explicitly rejected by on-chain verifyClaim.
    if (!isEligible || isClaimValid === false) return "ineligible";
    // No migrator on this chain (e.g. connected to Arbitrum), policy inactive, or paused.
    if (!migrator || migratorEnabled !== true || migratorActive !== true) return "not-live";
    if (remaining !== undefined && remaining === 0n) return "fully-migrated";
    return "ready";
  }, [
    mock,
    isConnected,
    merkleRootLoading,
    claimLoading,
    migrationInfoLoading,
    hasMerkleRoot,
    isOnChainMerkleRootActive,
    isEligible,
    isClaimValid,
    migrator,
    migratorEnabled,
    migratorActive,
    remaining,
  ]);

  const migration: MigrationAction | undefined = useMemo(
    () =>
      migrationStatus
        ? { status: migrationStatus, onMigrate: () => setIsMigrateOpen(true) }
        : undefined,
    [migrationStatus],
  );

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

  const ohmBalances = tokenBalances.OHM;
  const sohmBalances = tokenBalances.sOHM;
  const gohmBalances = tokenBalances.gOHM;
  const wsohmBalances = tokenBalances.wsOHM;
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
        icon: "OHMTokenIcon" as IconName,
        balances: ohmBalances,
        price: ohmPriceNum,
      },
      {
        symbol: "sOHM",
        label: "sOHM",
        sublabel: "Staked OHM",
        icon: "OHMTokenIcon" as IconName,
        balances: sohmBalances,
        price: ohmPriceNum,
      },
      {
        symbol: "gOHM",
        label: "gOHM",
        sublabel: "Governance OHM",
        icon: "GOHMTokenIcon" as IconName,
        balances: gohmBalances,
        price: gohmPriceNum,
      },
      {
        symbol: "wsOHM",
        label: "wsOHM",
        sublabel: "Wrapped sOHM (legacy)",
        icon: "GOHMTokenIcon" as IconName,
        balances: wsohmBalances,
        price: gohmPriceNum,
      },
      {
        symbol: "OHM v1",
        label: "OHM v1",
        sublabel: "Legacy",
        icon: "OHMTokenIcon" as IconName,
        balances: v1OhmBalances,
        price: ohmPriceNum,
      },
      {
        symbol: "sOHM v1",
        label: "sOHM v1",
        sublabel: "Legacy",
        icon: "OHMTokenIcon" as IconName,
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
                <BalanceCards
                  tokens={tokens}
                  migration={migration}
                  onUnstakeV1={() => setIsUnstakeV1Open(true)}
                  onUnwrapWsohm={() => setIsUnwrapWsohmOpen(true)}
                />
              ) : (
                <BalanceTable
                  tokens={tokens}
                  migration={migration}
                  onUnstakeV1={() => setIsUnstakeV1Open(true)}
                  onUnwrapWsohm={() => setIsUnwrapWsohmOpen(true)}
                />
              )
            ) : (
              <BalanceEmptyState isLoading={isLoading} />
            )}
          </>
        )}
      </div>

      {claim && remaining !== undefined && (
        <MigrateOhmModal
          isOpen={isMigrateOpen}
          onClose={() => setIsMigrateOpen(false)}
          claim={claim}
          remaining={remaining}
        />
      )}

      <UnstakeSohmV1Modal isOpen={isUnstakeV1Open} onClose={() => setIsUnstakeV1Open(false)} />

      <UnwrapWsohmModal isOpen={isUnwrapWsohmOpen} onClose={() => setIsUnwrapWsohmOpen(false)} />
    </div>
  );
}
