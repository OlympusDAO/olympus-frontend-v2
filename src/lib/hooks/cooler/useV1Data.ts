import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { coolerGraphqlClient } from "@/lib/graphql-client";

// ---------------------------------------------------------------------------
// GraphQL query strings (ported from .graphql files)
// ---------------------------------------------------------------------------

const CLEARINGHOUSE_STATS_QUERY = `
  query ClearinghouseStats {
    clearinghouseCumulativeStats_collection {
      currentActiveBorrowers
      lastUpdateTimestamp
      totalLoans
      totalRepaidLoans
      totalDefaultedLoans
      totalUniqueBorrowers
      currentActiveLoans
      totalLoopers
      currentActiveLoopers
    }
  }
`;

const CLEARINGHOUSES_QUERY = `
  query Clearinghouses {
    clearinghouses {
      address
    }
  }
`;

const ACTIVE_LOANS_QUERY = `
  query GetActiveLoansByMaturity($first: Int = 1000, $skip: Int = 0, $principal: BigDecimal = "0", $date: BigInt) {
    coolerLoans(
      first: $first
      skip: $skip
      orderBy: currentExpiryTimestamp
      orderDirection: asc
      where: {
        principal_gt: $principal
        currentExpiryTimestamp_gt: $date
      }
    ) {
      id
      borrower {
        id
      }
      cooler
      principal
      currentExpiryTimestamp
      interest
      collateral
      loanId
      defaultedClaimEvents {
        collateralPrice
      }
      extendEvents(orderBy: blockTimestamp, orderDirection: desc, first: 1) {
        expiryTimestamp
      }
    }
  }
`;

const DEFAULTED_LOANS_QUERY = `
  query GetDefaultedLoans($first: Int = 1000, $skip: Int = 0) {
    coolerLoans(
      first: $first
      skip: $skip
      orderBy: currentExpiryTimestamp
      orderDirection: asc
      where: { defaultedClaimEvents_: { id_not: null } }
    ) {
      id
      borrower {
        id
      }
      loanId
      cooler
      currentExpiryTimestamp
      defaultedClaimEvents {
        defaultedPrincipal
        collateralValueClaimed
        collateralQuantityClaimed
      }
    }
  }
`;

const BORROWERS_QUERY = `
  query Borrowers($first: Int = 1000, $skip: Int = 0) {
    borrowerStats_collection(
      orderBy: lastUpdateTimestamp
      first: $first
      skip: $skip
    ) {
      loans {
        id
      }
      currentInterestDue
      currentCollateral
      currentBorrowed
      borrower
      activeLoans
      maxActiveLoans
      maxBorrowedValue
      totalDefaultedLoans
      totalLoanExtensions
      totalLoans
      totalRepaidLoans
    }
  }
`;

const PROTOCOL_INCOME_QUERY = `
  query ProtocolIncome($first: Int = 1000, $skip: Int = 0) {
    defaultStats_collection(interval: day, first: $first, skip: $skip) {
      totalCollateralClaimed
      totalValueClaimed
      totalPrincipalDefaulted
      timestamp
    }
    extensionStats_collection(interval: day, first: $first, skip: $skip) {
      totalNewInterest
      timestamp
    }
    repaymentStats_collection(interval: day, first: $first, skip: $skip) {
      timestamp
      totalInterestPaid
    }
  }
`;

const TOP_BORROW_QUERY = `
  query TopBorrow {
    clearLoanRequestEvents(
      orderBy: loan__principal
      orderDirection: desc
      first: 1
    ) {
      loan {
        principal
      }
    }
  }
`;

const TOP_LOOPER_QUERY = `
  query TopLooper {
    borrowerStats_collection(
      first: 1
      orderBy: maxActiveLoans
      orderDirection: desc
    ) {
      maxActiveLoans
      totalLoans
      activeLoans
    }
  }
`;

const TOP_TOTAL_BORROWS_QUERY = `
  query TopTotalBorrows {
    borrowerStats_collection(
      orderDirection: desc
      orderBy: maxBorrowedValue
      first: 1
    ) {
      maxBorrowedValue
    }
  }
`;

export const UTILIZATION_QUERY = `
  query Utilization($clearinghouseAddress: String) {
    clearinghouseSnapshotStats_collection(
      first: 1000
      interval: day
      where: { clearinghouse: $clearinghouseAddress }
    ) {
      timestamp
      clearinghouse {
        address
      }
      totalPrincipalReceivables
      totalInterestReceivables
      sReserveInReserveBalance
      treasurySReserveInReserveBalance
      treasuryReserveBalance
      reserveBalance
    }
  }
`;

// ---------------------------------------------------------------------------
// Response interfaces
// ---------------------------------------------------------------------------

export interface ClearinghouseCumulativeStat {
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

export interface ClearinghouseStatsResponse {
  clearinghouseCumulativeStats_collection: ClearinghouseCumulativeStat[];
}

export interface Clearinghouse {
  address: string;
}

export interface ClearinghousesResponse {
  clearinghouses: Clearinghouse[];
}

export interface ActiveLoan {
  id: string;
  borrower: {
    id: string;
  };
  cooler: string;
  principal: string;
  currentExpiryTimestamp: string;
  interest: string;
  collateral: string;
  loanId: string;
  defaultedClaimEvents: {
    collateralPrice: string;
  }[];
  extendEvents: {
    expiryTimestamp: string;
  }[];
}

export interface ActiveLoansResponse {
  coolerLoans: ActiveLoan[];
}

export interface DefaultedLoan {
  id: string;
  borrower: {
    id: string;
  };
  loanId: string;
  cooler: string;
  currentExpiryTimestamp: string;
  defaultedClaimEvents: {
    defaultedPrincipal: string;
    collateralValueClaimed: string;
    collateralQuantityClaimed: string;
  }[];
}

export interface DefaultedLoansResponse {
  coolerLoans: DefaultedLoan[];
}

export interface BorrowerStat {
  loans: { id: string }[];
  currentInterestDue: string;
  currentCollateral: string;
  currentBorrowed: string;
  borrower: string;
  activeLoans: number;
  maxActiveLoans: number;
  maxBorrowedValue: string;
  totalDefaultedLoans: number;
  totalLoanExtensions: number;
  totalLoans: number;
  totalRepaidLoans: number;
}

export interface BorrowersResponse {
  borrowerStats_collection: BorrowerStat[];
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

export interface ProtocolIncomeResponse {
  defaultStats_collection: DefaultStat[];
  extensionStats_collection: ExtensionStat[];
  repaymentStats_collection: RepaymentStat[];
}

export interface TopBorrowResponse {
  clearLoanRequestEvents: {
    loan: {
      principal: string;
    };
  }[];
}

export interface TopLooperResponse {
  borrowerStats_collection: {
    maxActiveLoans: number;
    totalLoans: number;
    activeLoans: number;
  }[];
}

export interface TopTotalBorrowsResponse {
  borrowerStats_collection: {
    maxBorrowedValue: string;
  }[];
}

export interface UtilizationSnapshot {
  timestamp: string;
  clearinghouse: {
    address: string;
  };
  totalPrincipalReceivables: string;
  totalInterestReceivables: string;
  sReserveInReserveBalance: string;
  treasurySReserveInReserveBalance: string;
  treasuryReserveBalance: string;
  reserveBalance: string;
}

export interface UtilizationResponse {
  clearinghouseSnapshotStats_collection: UtilizationSnapshot[];
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useClearinghouseStats() {
  return useQuery({
    queryKey: ["cooler-v1-clearinghouse-stats"],
    queryFn: async () => {
      const data =
        await coolerGraphqlClient.request<ClearinghouseStatsResponse>(
          CLEARINGHOUSE_STATS_QUERY,
        );
      return data;
    },
  });
}

export function useClearinghouses() {
  return useQuery({
    queryKey: ["cooler-v1-clearinghouses"],
    queryFn: async () => {
      const data =
        await coolerGraphqlClient.request<ClearinghousesResponse>(
          CLEARINGHOUSES_QUERY,
        );
      return data;
    },
  });
}

export function useActiveLoans() {
  const nowTimestamp = Math.floor(Date.now() / 1000).toString();

  return useInfiniteQuery({
    queryKey: ["cooler-v1-active-loans"],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await coolerGraphqlClient.request<ActiveLoansResponse>(
        ACTIVE_LOANS_QUERY,
        {
          first: 1000,
          skip: pageParam,
          principal: "0",
          date: nowTimestamp,
        },
      );
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.coolerLoans.length < 1000) return undefined;
      return allPages.length * 1000;
    },
    initialPageParam: 0,
  });
}

export function useDefaultedLoans() {
  return useInfiniteQuery({
    queryKey: ["cooler-v1-defaulted-loans"],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await coolerGraphqlClient.request<DefaultedLoansResponse>(
        DEFAULTED_LOANS_QUERY,
        {
          first: 1000,
          skip: pageParam,
        },
      );
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.coolerLoans.length < 1000) return undefined;
      return allPages.length * 1000;
    },
    initialPageParam: 0,
  });
}

export function useBorrowers() {
  return useInfiniteQuery({
    queryKey: ["cooler-v1-borrowers"],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await coolerGraphqlClient.request<BorrowersResponse>(
        BORROWERS_QUERY,
        {
          first: 1000,
          skip: pageParam,
        },
      );
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.borrowerStats_collection.length < 1000) return undefined;
      return allPages.length * 1000;
    },
    initialPageParam: 0,
  });
}

export function useProtocolIncome() {
  return useQuery({
    queryKey: ["cooler-v1-protocol-income"],
    queryFn: async () => {
      const data =
        await coolerGraphqlClient.request<ProtocolIncomeResponse>(
          PROTOCOL_INCOME_QUERY,
        );
      return data;
    },
  });
}

export function useTopBorrow() {
  return useQuery({
    queryKey: ["cooler-v1-top-borrow"],
    queryFn: async () => {
      const data =
        await coolerGraphqlClient.request<TopBorrowResponse>(TOP_BORROW_QUERY);
      return data;
    },
  });
}

export function useTopLooper() {
  return useQuery({
    queryKey: ["cooler-v1-top-looper"],
    queryFn: async () => {
      const data =
        await coolerGraphqlClient.request<TopLooperResponse>(TOP_LOOPER_QUERY);
      return data;
    },
  });
}

export function useTopTotalBorrows() {
  return useQuery({
    queryKey: ["cooler-v1-top-total-borrows"],
    queryFn: async () => {
      const data =
        await coolerGraphqlClient.request<TopTotalBorrowsResponse>(
          TOP_TOTAL_BORROWS_QUERY,
        );
      return data;
    },
  });
}

export function useUtilization(clearinghouseAddress: string) {
  return useQuery({
    queryKey: ["cooler-v1-utilization", clearinghouseAddress],
    queryFn: async () => {
      const data =
        await coolerGraphqlClient.request<UtilizationResponse>(
          UTILIZATION_QUERY,
          { clearinghouseAddress },
        );
      return data;
    },
    enabled: !!clearinghouseAddress,
  });
}
