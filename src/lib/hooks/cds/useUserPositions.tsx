import { useMemo } from "react";
import { useAccount, useChainId, useReadContract, useReadContracts } from "wagmi";
import { getContractAddress, ContractName } from "@/lib/contracts";
import ConvertibleDepositPositionManagerABI from "@/abis/ConvertibleDepositPositionManager";
import ConvertibleDepositFacilityABI from "@/abis/ConvertibleDepositFacility";
import ReceiptTokenManagerABI from "@/abis/ReceiptTokenManager";
import type { Address, ContractFunctionReturnType } from "viem";
import { formatTermSuffix } from "@/lib/utils";

type PositionData = ContractFunctionReturnType<
  typeof ConvertibleDepositPositionManagerABI,
  "view",
  "getPosition"
>;

export type UserPosition = {
  id: bigint;
  data: PositionData | undefined;
  displayName: string;
};

// Unique key for an (asset, periodMonths) combo — used to dedupe receipt-token lookups
// across positions that share the same receipt token.
const tokenKey = (asset: Address, periodMonths: number) => `${asset.toLowerCase()}-${periodMonths}`;

export const useUserPositions = () => {
  const { address } = useAccount();
  const chainId = useChainId();

  const positionManagerAddress = getContractAddress(
    ContractName.CONVERTIBLE_DEPOSIT_POSITION_MANAGER,
    chainId,
  );
  const facilityAddress = getContractAddress(ContractName.CONVERTIBLE_DEPOSIT_FACILITY, chainId);
  const receiptTokenManagerAddress = getContractAddress(
    ContractName.RECEIPT_TOKEN_MANAGER,
    chainId,
  );

  // ── 1. User's position IDs ────────────────────────────────────────────────
  const {
    data: positionIds,
    isLoading: isLoadingIds,
    error: idsError,
  } = useReadContract({
    address: positionManagerAddress,
    abi: ConvertibleDepositPositionManagerABI,
    functionName: "getUserPositionIds",
    args: [address as `0x${string}`],
    query: { enabled: !!address && !!positionManagerAddress },
  });

  // ── 2. Position details, batched into a single multicall ──────────────────
  const positionContracts = useMemo(
    () =>
      (positionIds as bigint[] | undefined)?.map((id) => ({
        address: positionManagerAddress,
        abi: ConvertibleDepositPositionManagerABI,
        functionName: "getPosition" as const,
        args: [id],
      })) ?? [],
    [positionIds, positionManagerAddress],
  );

  const {
    data: positionsData,
    isLoading: isLoadingPositions,
    error: positionsError,
  } = useReadContracts({
    contracts: positionContracts,
    query: {
      enabled: !!positionIds && positionIds.length > 0 && !!positionManagerAddress,
    },
  });

  // ── 3. Stable (id, data) pairs filtered to active positions ───────────────
  // Memoized so the array reference doesn't churn on every parent re-render —
  // important because this drives the active-positions React Table's data prop.
  const rawPositions = useMemo(() => {
    if (!positionIds || !positionsData) return [];
    return (positionIds as bigint[])
      .map((id, index) => ({
        id,
        data: positionsData[index]?.result as PositionData | undefined,
      }))
      .filter((pos): pos is { id: bigint; data: PositionData } =>
        Boolean(pos.data && pos.data.remainingDeposit > 0n),
      );
  }, [positionIds, positionsData]);

  // ── 4. DEPOSIT_MANAGER address (single call, used as arg below) ───────────
  const { data: depositManagerAddress } = useReadContract({
    address: facilityAddress,
    abi: ConvertibleDepositFacilityABI,
    functionName: "DEPOSIT_MANAGER",
    query: { enabled: !!facilityAddress },
  });

  // ── 5. Unique (asset, periodMonths) combos across all positions ───────────
  // Previously each row component subscribed to its own getReceiptTokenId /
  // getTokenSymbol via useReadContract — that fanned out to N×3 subscriptions
  // and made re-renders scale linearly with position count. We dedupe at the
  // hook level and resolve names with two batched multicalls.
  const uniqueTokenKeys = useMemo(() => {
    const seen = new Set<string>();
    const unique: Array<{ key: string; asset: Address; periodMonths: number }> = [];
    for (const pos of rawPositions) {
      const key = tokenKey(pos.data.asset, pos.data.periodMonths);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({ key, asset: pos.data.asset, periodMonths: pos.data.periodMonths });
      }
    }
    return unique;
  }, [rawPositions]);

  // ── 6. Batched receipt token IDs (one multicall) ──────────────────────────
  const tokenIdContracts = useMemo(
    () =>
      uniqueTokenKeys.map((k) => ({
        address: receiptTokenManagerAddress as Address,
        abi: ReceiptTokenManagerABI,
        functionName: "getReceiptTokenId" as const,
        args: [
          depositManagerAddress as Address,
          k.asset,
          k.periodMonths,
          facilityAddress as Address,
        ],
      })),
    [uniqueTokenKeys, receiptTokenManagerAddress, depositManagerAddress, facilityAddress],
  );

  const { data: tokenIdResults } = useReadContracts({
    contracts: tokenIdContracts,
    query: {
      enabled:
        uniqueTokenKeys.length > 0 &&
        !!receiptTokenManagerAddress &&
        !!depositManagerAddress &&
        !!facilityAddress,
    },
  });

  // ── 7. Map key → tokenId for successful lookups only ──────────────────────
  const tokenIdByKey = useMemo(() => {
    const m = new Map<string, bigint>();
    if (!tokenIdResults) return m;
    uniqueTokenKeys.forEach((k, i) => {
      const r = tokenIdResults[i];
      if (r?.status === "success" && r.result !== undefined) {
        m.set(k.key, r.result as bigint);
      }
    });
    return m;
  }, [uniqueTokenKeys, tokenIdResults]);

  // ── 8. Batched token symbols (one multicall) ──────────────────────────────
  const symbolEntries = useMemo(() => Array.from(tokenIdByKey.entries()), [tokenIdByKey]);

  const symbolContracts = useMemo(
    () =>
      symbolEntries.map(([, tokenId]) => ({
        address: receiptTokenManagerAddress as Address,
        abi: ReceiptTokenManagerABI,
        functionName: "getTokenSymbol" as const,
        args: [tokenId],
      })),
    [symbolEntries, receiptTokenManagerAddress],
  );

  const { data: symbolResults } = useReadContracts({
    contracts: symbolContracts,
    query: { enabled: symbolContracts.length > 0 && !!receiptTokenManagerAddress },
  });

  // ── 9. Key → display-name map (with fallback handled at the call site) ────
  const displayNameMap = useMemo(() => {
    const m = new Map<string, string>();
    if (!symbolResults) return m;
    symbolEntries.forEach(([key], i) => {
      const sym = symbolResults[i]?.result;
      if (typeof sym === "string") {
        const cleaned = sym.replace(/\0/g, "").trim();
        if (cleaned) m.set(key, cleaned);
      }
    });
    return m;
  }, [symbolEntries, symbolResults]);

  // ── 10. Enriched positions with stable identity ───────────────────────────
  const positions: UserPosition[] = useMemo(
    () =>
      rawPositions.map((pos) => {
        const key = tokenKey(pos.data.asset, pos.data.periodMonths);
        const displayName =
          displayNameMap.get(key) ?? `cdUSDS-${formatTermSuffix(pos.data.periodMonths)}`;
        return { id: pos.id, data: pos.data, displayName };
      }),
    [rawPositions, displayNameMap],
  );

  return {
    positions,
    // `isLoading` covers position fetching only — receipt-token metadata
    // (DEPOSIT_MANAGER, token IDs, symbols) resolves in the background and each
    // row's `displayName` falls back to `cdUSDS-${term}` until its real symbol
    // lands. Intentional: render the table ASAP rather than gate it on metadata.
    isLoading: isLoadingIds || isLoadingPositions,
    error: idsError || positionsError,
    refetch: () => {
      // This would trigger a refetch of both queries
    },
  };
};
