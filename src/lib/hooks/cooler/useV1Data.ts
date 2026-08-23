import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchIndexerData } from "@/lib/indexer/client";

// Cooler v1 data from the protocol indexer.
//
// Each hook returns its ROWS, not the transport envelope. The subgraph versions
// returned the GraphQL response object, so callers destructured names like
// `coolerLoans` and `borrowerStats_collection` — query-language artefacts that
// have no meaning against a REST route.
//
// Numerics are strings. The indexer stores uint256-derived values that do not
// survive a JSON number, so anything monetary stays a string until the point of
// display.

const PAGE_SIZE = 1000;

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface ClearinghouseCumulativeStat {
  id: string;
  currentActiveBorrowers: number;
  lastUpdateTimestamp: string;
  totalLoans: number;
  totalRepaidLoans: number;
  totalDefaultedLoans: number;
  totalUniqueBorrowers: number;
  currentActiveLoans: number;
  totalLoopers: number;
  currentActiveLoopers: number;
}

export interface Clearinghouse {
  address: string;
}

export interface ActiveLoan {
  id: string;
  borrower: { id: string };
  cooler: string;
  principal: string;
  currentExpiryTimestamp: string;
  interest: string;
  collateral: string;
  loanId: string;
  defaultedClaimEvents: { collateralPrice: string }[];
  extendEvents: { expiryTimestamp: string }[];
}

export interface DefaultedLoan {
  id: string;
  borrower: { id: string };
  loanId: string;
  cooler: string;
  currentExpiryTimestamp: string;
  defaultedClaimEvents: {
    defaultedPrincipal: string;
    collateralValueClaimed: string;
    collateralQuantityClaimed: string;
  }[];
}

export interface BorrowerStat {
  borrower: string;
  currentInterestDue: string;
  currentCollateral: string;
  currentBorrowed: string;
  activeLoans: number;
  maxActiveLoans: number;
  maxBorrowedValue: string;
  totalDefaultedLoans: number;
  totalLoanExtensions: number;
  totalLoans: number;
  totalRepaidLoans: number;
}

export interface DefaultStat {
  totalCollateralClaimed: string;
  totalValueClaimed: string;
  totalPrincipalDefaulted: string;
  timestamp: string;
}

export interface ExtensionStat {
  totalNewInterest: string;
  timestamp: string;
}

export interface RepaymentStat {
  timestamp: string;
  totalInterestPaid: string;
}

export interface ProtocolIncome {
  defaults: DefaultStat[];
  extensions: ExtensionStat[];
  repayments: RepaymentStat[];
}

export interface UtilizationSnapshot {
  timestamp: string;
  clearinghouse: { address: string };
  totalPrincipalReceivables: string;
  totalInterestReceivables: string;
  sReserveInReserveBalance: string;
  treasurySReserveInReserveBalance: string;
  treasuryReserveBalance: string;
  reserveBalance: string;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useClearinghouseStats() {
  return useQuery({
    queryKey: ["cooler-v1-clearinghouse-stats"],
    queryFn: () => fetchIndexerData<ClearinghouseCumulativeStat[]>("/v1/cooler/stats"),
  });
}

export function useClearinghouses() {
  return useQuery({
    queryKey: ["cooler-v1-clearinghouses"],
    queryFn: () => fetchIndexerData<Clearinghouse[]>("/v1/cooler/clearinghouses"),
  });
}

export function useActiveLoans() {
  // Captured once per hook instance rather than per page: a clock that advances
  // mid-pagination would shift the filter under the cursor and can drop or
  // repeat a loan at the boundary.
  const nowTimestamp = Math.floor(Date.now() / 1000).toString();

  return useInfiniteQuery({
    queryKey: ["cooler-v1-active-loans"],
    queryFn: ({ pageParam = 0 }) =>
      fetchIndexerData<ActiveLoan[]>("/v1/cooler/loans", {
        minPrincipal: "0",
        expiryAfter: nowTimestamp,
        order: "asc",
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    initialPageParam: 0,
  });
}

export function useDefaultedLoans() {
  return useInfiniteQuery({
    queryKey: ["cooler-v1-defaulted-loans"],
    queryFn: ({ pageParam = 0 }) =>
      fetchIndexerData<DefaultedLoan[]>("/v1/cooler/loans", {
        defaulted: true,
        order: "asc",
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    initialPageParam: 0,
  });
}

export function useBorrowers() {
  return useInfiniteQuery({
    queryKey: ["cooler-v1-borrowers"],
    queryFn: ({ pageParam = 0 }) =>
      fetchIndexerData<BorrowerStat[]>("/v1/cooler/borrowers", {
        orderBy: "lastUpdateTimestamp",
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    initialPageParam: 0,
  });
}

export function useProtocolIncome() {
  return useQuery({
    queryKey: ["cooler-v1-protocol-income"],
    // One request. The subgraph needed three aggregation collections fetched
    // together and zipped by day; the route returns them already grouped.
    queryFn: () =>
      fetchIndexerData<ProtocolIncome>("/v1/cooler/daily/protocol-income", { limit: PAGE_SIZE }),
  });
}

export function useTopBorrow() {
  return useQuery({
    queryKey: ["cooler-v1-top-borrow"],
    // The largest single loan ever cleared. Ordering loans by principal is what
    // the subgraph did through a relation (`orderBy: loan__principal`).
    queryFn: () =>
      fetchIndexerData<{ principal: string }[]>("/v1/cooler/loans", {
        orderBy: "principal",
        order: "desc",
        limit: 1,
      }),
  });
}

export function useTopLooper() {
  return useQuery({
    queryKey: ["cooler-v1-top-looper"],
    queryFn: () =>
      fetchIndexerData<BorrowerStat[]>("/v1/cooler/borrowers", {
        orderBy: "maxActiveLoans",
        order: "desc",
        limit: 1,
      }),
  });
}

export function useTopTotalBorrows() {
  return useQuery({
    queryKey: ["cooler-v1-top-total-borrows"],
    queryFn: () =>
      fetchIndexerData<BorrowerStat[]>("/v1/cooler/borrowers", {
        orderBy: "maxBorrowedValue",
        order: "desc",
        limit: 1,
      }),
  });
}

export function useUtilization(clearinghouseAddress: string) {
  return useQuery({
    queryKey: ["cooler-v1-utilization", clearinghouseAddress],
    queryFn: () =>
      fetchIndexerData<UtilizationSnapshot[]>("/v1/cooler/daily/clearinghouse-snapshots", {
        clearinghouse: clearinghouseAddress,
        limit: PAGE_SIZE,
      }),
    enabled: !!clearinghouseAddress,
  });
}
