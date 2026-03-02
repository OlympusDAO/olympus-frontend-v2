import { useQuery } from "@tanstack/react-query";
import { coolerGraphqlClient } from "@/lib/graphql-client";

// TypeScript interfaces matching the MonoCooler subgraph schema
export interface MonoCoolerGlobalState {
  id: string;
  totalCollateral: string; // BigDecimal from subgraph
  totalDebt: string; // BigDecimal from subgraph
  interestAccumulatorRay: string; // BigInt from subgraph
  interestRateWad: string; // BigInt from subgraph
  ltvOracle: string; // Bytes (address)
  liquidationPaused: boolean;
  borrowsPaused: boolean;
  treasuryBorrower: string; // Bytes (address)
  updatedAt: string; // BigInt timestamp
}

export interface MonoCoolerGlobalSnapshot {
  id: string;
  timestamp: string; // BigInt from subgraph
  totalCollateral: string; // BigDecimal from subgraph
  totalDebt: string; // BigDecimal from subgraph
  interestRateWad: string; // BigInt from subgraph
}

// Add new interface for aggregated stats
export interface MonoCoolerGlobalStats {
  id: number;
  timestamp: string; // Timestamp from subgraph
  totalCollateral: string; // BigInt from subgraph
  totalDebt: string; // BigInt from subgraph
  interestRateWad: string; // BigInt from subgraph
  maxOriginationLtv: string; // BigInt from subgraph
  liquidationLtv: string; // BigInt from subgraph
  snapshotCount: number; // Int from subgraph
}

export interface MonoCoolerAccount {
  id: string;
  address: string; // Bytes (address)
  collateral: string; // BigInt from subgraph (WAD format)
  debt: string; // BigInt from subgraph (WAD format)
  ltv: string; // BigInt from subgraph (WAD format)
  healthFactor: string; // BigInt from subgraph (WAD format)
  updatedAt: string; // BigInt timestamp
}

export interface MonoCoolerActivity {
  id: string;
  type: string;
  account: {
    address: string;
  };
  amount: string; // BigInt from subgraph (WAD format)
  collateral?: string; // Optional BigInt (WAD format)
  debt?: string; // Optional BigInt (WAD format)
  txHash: string; // Bytes
  timestamp: string; // BigInt timestamp
}

// Processed interfaces for UI consumption
export interface V2ProtocolData {
  totalCollateral: number;
  totalDebt: number;
  interestRate: number;
  liquidationsPaused: boolean;
  borrowsPaused: boolean;
  ltvOracle: string;
  treasuryBorrower: string;
  updatedAt: number;
}

export interface V2HistoricalDataPoint {
  timestamp: number;
  totalCollateral: number;
  totalDebt: number;
  interestRate: number;
  maxOriginationLtv: number;
}

export interface V2Account {
  address: string;
  collateral: number;
  debt: number;
  ltv: number;
  healthFactor: number;
  updatedAt: number;
}

export interface V2Activity {
  id: string;
  type: string;
  account: string;
  amount: number;
  collateral?: number;
  debt?: number;
  timestamp: number;
  txHash: string;
}

// Utility functions for data transformation
function parseWadToPercent(wadValue: string): number {
  // WAD is 10^18, convert to percentage
  return (parseFloat(wadValue) / 1e18) * 100;
}

function parseBigDecimal(value: string): number {
  // All BigInt values in subgraph are in WAD format (18 decimals), convert to normal units
  return parseFloat(value) / 1e18;
}

function parseBigInt(value: string): number {
  try {
    // Handle BigInt values from subgraph properly
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) {
      console.warn("Invalid BigInt value:", value);
      return 0;
    }
    return num;
  } catch (error) {
    console.error("Error parsing BigInt:", value, error);
    return 0;
  }
}

// Add new function to parse Timestamp fields from aggregated data
function parseTimestamp(value: string): number {
  try {
    // Handle Timestamp values from subgraph - could be ISO string or unix timestamp
    if (typeof value === "string") {
      // Try parsing as ISO string first
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.getTime() * 1000; // Convert to microseconds for compatibility
      }

      // If not ISO, try parsing as number (unix timestamp)
      const num = Number(value);
      if (!Number.isNaN(num) && num > 0) {
        // Check if it's already in microseconds (very large number) or seconds
        if (num > 1e12) {
          return num; // Already in microseconds
        } else {
          return num * 1000000; // Convert seconds to microseconds
        }
      }
    }

    console.warn("Invalid timestamp value:", value);
    return 0;
  } catch (error) {
    console.error("Error parsing timestamp:", value, error);
    return 0;
  }
}

// GraphQL query imports
const MONOCOOLER_GLOBAL_STATE_QUERY = `
  query MonoCoolerGlobalState {
    monoCoolerGlobalStates(first: 1) {
      id
      totalCollateral
      totalDebt
      interestAccumulatorRay
      interestRateWad
      ltvOracle
      liquidationPaused
      borrowsPaused
      treasuryBorrower
      updatedAt
    }
  }
`;

const MONOCOOLER_HISTORICAL_DATA_QUERY = `
  query MonoCoolerHistoricalData($first: Int = 100, $interval: String = "day") {
    monoCoolerGlobalStats_collection(
      first: $first
      interval: $interval
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      timestamp
      totalCollateral
      totalDebt
      interestRateWad
      maxOriginationLtv
      liquidationLtv
      snapshotCount
    }
  }
`;

const MONOCOOLER_ACCOUNTS_QUERY = `
  query MonoCoolerAccounts($first: Int = 100, $orderBy: String = "healthFactor", $orderDirection: String = "asc") {
    monoCoolerAccounts(
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      address
      collateral
      debt
      ltv
      healthFactor
      updatedAt
    }
  }
`;

const MONOCOOLER_AT_RISK_ACCOUNTS_QUERY = `
  query MonoCoolerAtRiskAccounts($first: Int = 20, $healthFactorThreshold: BigInt = "1200000000000000000") {
    monoCoolerAccounts(
      first: $first
      where: { healthFactor_lt: $healthFactorThreshold }
      orderBy: healthFactor
      orderDirection: asc
    ) {
      id
      address
      collateral
      debt
      ltv
      healthFactor
      updatedAt
    }
  }
`;

const MONOCOOLER_RECENT_ACTIVITY_QUERY = `
  query MonoCoolerRecentActivity($first: Int = 50) {
    monoCoolerActivities(
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      type
      account {
        address
      }
      amount
      collateral
      debt
      txHash
      timestamp
    }
  }
`;

const MONOCOOLER_LIQUIDATIONS_QUERY = `
  query MonoCoolerLiquidations($first: Int = 20) {
    monoCoolerActivities(
      first: $first
      where: { type: "liquidation" }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      type
      account {
        address
      }
      amount
      collateral
      debt
      txHash
      timestamp
    }
  }
`;

// Hooks with actual GraphQL queries
export function useV2ProtocolData() {
  return useQuery({
    queryKey: ["v2-protocol-data"],
    queryFn: async (): Promise<V2ProtocolData | null> => {
      const response = await coolerGraphqlClient.request<{
        monoCoolerGlobalStates: MonoCoolerGlobalState[];
      }>(MONOCOOLER_GLOBAL_STATE_QUERY);

      const globalState = response.monoCoolerGlobalStates[0];
      if (!globalState) return null;

      return {
        totalCollateral: parseBigDecimal(globalState.totalCollateral),
        totalDebt: parseBigDecimal(globalState.totalDebt),
        interestRate: parseWadToPercent(globalState.interestRateWad),
        liquidationsPaused: globalState.liquidationPaused,
        borrowsPaused: globalState.borrowsPaused,
        ltvOracle: globalState.ltvOracle,
        treasuryBorrower: globalState.treasuryBorrower,
        updatedAt: parseBigInt(globalState.updatedAt),
      };
    },
  });
}

export function useV2HistoricalData(days: number = 30) {
  return useQuery({
    queryKey: ["v2-historical-data", days],
    queryFn: async (): Promise<V2HistoricalDataPoint[]> => {
      // Query gets newest data first (desc) to ensure we get recent data
      // Component reverses this for chronological display
      const response = await coolerGraphqlClient.request<{
        monoCoolerGlobalStats_collection: MonoCoolerGlobalStats[];
      }>(MONOCOOLER_HISTORICAL_DATA_QUERY, { first: days, interval: "day" });

      const result = response.monoCoolerGlobalStats_collection.map((stats) => ({
        timestamp: parseTimestamp(stats.timestamp),
        totalCollateral: parseBigDecimal(stats.totalCollateral),
        totalDebt: parseBigDecimal(stats.totalDebt),
        interestRate: parseWadToPercent(stats.interestRateWad),
        maxOriginationLtv: parseBigDecimal(stats.maxOriginationLtv),
      }));

      return result;
    },
  });
}

export function useV2Accounts(limit: number = 1000) {
  return useQuery({
    queryKey: ["v2-accounts", limit],
    queryFn: async (): Promise<V2Account[]> => {
      const response = await coolerGraphqlClient.request<{
        monoCoolerAccounts: MonoCoolerAccount[];
      }>(MONOCOOLER_ACCOUNTS_QUERY, { first: limit });

      return response.monoCoolerAccounts.map((account) => ({
        address: account.address,
        collateral: parseBigDecimal(account.collateral),
        debt: parseBigDecimal(account.debt),
        ltv: parseBigDecimal(account.ltv),
        healthFactor: parseBigDecimal(account.healthFactor),
        updatedAt: parseBigInt(account.updatedAt),
      }));
    },
  });
}

export function useV2AtRiskAccounts(limit: number = 20, threshold: number = 1.2) {
  return useQuery({
    queryKey: ["v2-at-risk-accounts", limit, threshold],
    queryFn: async (): Promise<V2Account[]> => {
      const response = await coolerGraphqlClient.request<{
        monoCoolerAccounts: MonoCoolerAccount[];
      }>(MONOCOOLER_AT_RISK_ACCOUNTS_QUERY, {
        first: limit,
        healthFactorThreshold: (threshold * 1e18).toString(),
      });

      return response.monoCoolerAccounts.map((account) => ({
        address: account.address,
        collateral: parseBigDecimal(account.collateral),
        debt: parseBigDecimal(account.debt),
        ltv: parseBigDecimal(account.ltv),
        healthFactor: parseBigDecimal(account.healthFactor),
        updatedAt: parseBigInt(account.updatedAt),
      }));
    },
  });
}

export function useV2RecentActivity(limit: number = 50) {
  return useQuery({
    queryKey: ["v2-recent-activity", limit],
    queryFn: async (): Promise<V2Activity[]> => {
      const response = await coolerGraphqlClient.request<{
        monoCoolerActivities: MonoCoolerActivity[];
      }>(MONOCOOLER_RECENT_ACTIVITY_QUERY, { first: limit });

      return response.monoCoolerActivities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        account: activity.account.address,
        amount: parseBigDecimal(activity.amount),
        collateral: activity.collateral ? parseBigDecimal(activity.collateral) : undefined,
        debt: activity.debt ? parseBigDecimal(activity.debt) : undefined,
        timestamp: parseBigInt(activity.timestamp),
        txHash: activity.txHash,
      }));
    },
  });
}

export function useV2Liquidations(limit: number = 20) {
  return useQuery({
    queryKey: ["v2-liquidations", limit],
    queryFn: async (): Promise<V2Activity[]> => {
      const response = await coolerGraphqlClient.request<{
        monoCoolerActivities: MonoCoolerActivity[];
      }>(MONOCOOLER_LIQUIDATIONS_QUERY, { first: limit });

      return response.monoCoolerActivities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        account: activity.account.address,
        amount: parseBigDecimal(activity.amount),
        collateral: activity.collateral ? parseBigDecimal(activity.collateral) : undefined,
        debt: activity.debt ? parseBigDecimal(activity.debt) : undefined,
        timestamp: parseBigInt(activity.timestamp),
        txHash: activity.txHash,
      }));
    },
  });
}
