import { useQueries } from "@tanstack/react-query";
import { coolerGraphqlClient } from "@/lib/graphql-client";
import {
  useClearinghouses,
  UTILIZATION_QUERY,
  type UtilizationResponse,
} from "@/lib/hooks/cooler/useV1Data";

function formatDate(timestamp: string): string {
  try {
    const timestampNum = Number(timestamp);
    if (isNaN(timestampNum) || timestampNum <= 0) {
      return "";
    }
    // Convert from microseconds to milliseconds by dividing by 1000
    const date = new Date(timestampNum / 1000);
    if (date.toString() === "Invalid Date") {
      return "";
    }
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export interface V1UtilizationDataPoint {
  date: string;
  totalPrincipalReceivables: number;
  totalInterestReceivables: number;
  sReserveInReserveBalance: number;
  treasurySReserveInReserveBalance: number;
  reserveBalance: number;
  treasuryReserveBalance: number;
  byAddress: Record<
    string,
    {
      principalReceivables: number;
      interestReceivables: number;
      sReserveInReserveBalance: number;
      treasurySReserveInReserveBalance: number;
      reserveBalance: number;
      treasuryReserveBalance: number;
    }
  >;
}

export function useV1UtilizationData() {
  const { data: clearinghousesData, isLoading: clearinghousesLoading } =
    useClearinghouses();
  const clearinghouses = clearinghousesData?.clearinghouses ?? [];

  const utilizationQueries = useQueries({
    queries: clearinghouses.map((ch) => ({
      queryKey: ["cooler-v1-utilization", ch.address],
      queryFn: async () => {
        const data =
          await coolerGraphqlClient.request<UtilizationResponse>(
            UTILIZATION_QUERY,
            { clearinghouseAddress: ch.address },
          );
        return data;
      },
      enabled: !clearinghousesLoading,
    })),
  });

  const isLoading =
    clearinghousesLoading ||
    utilizationQueries.some((query) => query.isLoading);
  const hasError = utilizationQueries.some((query) => query.error);

  if (isLoading || hasError || clearinghouses.length === 0) {
    return {
      data: [],
      isLoading,
      hasError,
      isEmpty: clearinghouses.length === 0,
    };
  }

  // First, collect all dates and create a mapping of last known values per clearinghouse per date
  const allDates = new Set<string>();
  const valuesByDate = new Map<
    string,
    Map<
      string,
      {
        principalReceivables: number;
        interestReceivables: number;
        sReserveInReserveBalance: number;
        treasurySReserveInReserveBalance: number;
        reserveBalance: number;
        treasuryReserveBalance: number;
      }
    >
  >();

  // First pass: collect all dates and organize raw values by date
  utilizationQueries.forEach((query, index) => {
    const clearinghouse = clearinghouses[index];
    if (!clearinghouse?.address || !query.data) return;

    const snapshots = query.data.clearinghouseSnapshotStats_collection;
    snapshots.forEach((snapshot) => {
      const date = formatDate(snapshot.timestamp.toString());
      if (!date) return;

      allDates.add(date);

      if (!valuesByDate.has(date)) {
        valuesByDate.set(date, new Map());
      }

      const values = {
        principalReceivables:
          parseFloat(snapshot.totalPrincipalReceivables.toString()) || 0,
        interestReceivables:
          parseFloat(snapshot.totalInterestReceivables.toString()) || 0,
        sReserveInReserveBalance:
          parseFloat(snapshot.sReserveInReserveBalance.toString()) || 0,
        treasurySReserveInReserveBalance:
          parseFloat(
            snapshot.treasurySReserveInReserveBalance.toString(),
          ) || 0,
        reserveBalance:
          parseFloat(snapshot.reserveBalance.toString()) || 0,
        treasuryReserveBalance:
          parseFloat(snapshot.treasuryReserveBalance.toString()) || 0,
      };

      valuesByDate.get(date)!.set(clearinghouse.address, values);
    });
  });

  // Sort dates chronologically (oldest to newest)
  const sortedDates = Array.from(allDates).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  // Create the final data structure with carried forward values
  const allData = new Map<string, V1UtilizationDataPoint>();

  // Keep track of last known values for each clearinghouse as we process chronologically
  const lastKnownValues = new Map<
    string,
    {
      principalReceivables: number;
      interestReceivables: number;
      sReserveInReserveBalance: number;
      treasurySReserveInReserveBalance: number;
      reserveBalance: number;
      treasuryReserveBalance: number;
    }
  >();

  // Second pass: process each date chronologically (oldest to newest) and only use past values
  sortedDates.forEach((date) => {
    const dateData: V1UtilizationDataPoint = {
      date,
      totalPrincipalReceivables: 0,
      totalInterestReceivables: 0,
      sReserveInReserveBalance: 0,
      treasurySReserveInReserveBalance: 0,
      reserveBalance: 0,
      treasuryReserveBalance: 0,
      byAddress: {},
    };

    // For each date, process each clearinghouse
    clearinghouses.forEach((clearinghouse) => {
      if (!clearinghouse?.address) return;

      const address = clearinghouse.address;
      const valuesForDate = valuesByDate.get(date)?.get(address);

      let values;
      if (valuesForDate) {
        // Use actual values from this date
        values = valuesForDate;
        // Update last known values since we're processing chronologically
        lastKnownValues.set(address, values);
      } else {
        // Use last known values from the past
        values = lastKnownValues.get(address);
      }

      if (values) {
        // Store individual clearinghouse data
        dateData.byAddress[address] = values;

        // Update totals
        dateData.totalPrincipalReceivables += values.principalReceivables;
        dateData.totalInterestReceivables += values.interestReceivables;
        dateData.sReserveInReserveBalance += values.sReserveInReserveBalance;
        dateData.treasurySReserveInReserveBalance +=
          values.treasurySReserveInReserveBalance;
        dateData.reserveBalance += values.reserveBalance;
        dateData.treasuryReserveBalance += values.treasuryReserveBalance;
      }
    });

    allData.set(date, dateData);
  });

  // Convert to array and ensure chronological order for display
  const chartData = Array.from(allData.values());

  return {
    data: chartData,
    isLoading: false,
    hasError: false,
    isEmpty: false,
  };
}
