import { useQuery } from "@tanstack/react-query";
import { COOLER_SUBGRAPH_URL } from "@/lib/constants";

interface CoolerMetrics {
  totalBorrowed: number;
  totalCollateralGohm: number;
  v1Principal: number;
  v1Interest: number;
  monoDebt: number;
  interestRate: number;
}

export function useCoolerMetrics() {
  return useQuery<CoolerMetrics>({
    queryKey: ["coolerMetrics"],
    queryFn: async () => {
      // Query all 3 v1 clearinghouses (latest snapshot each) + MonoCooler + active loan counts
      const query = `
        query GetCoolerMetrics {
          clearinghouseSnapshots(
            orderBy: blockTimestamp
            orderDirection: desc
            first: 20
          ) {
            clearinghouse {
              id
            }
            principalReceivables
            interestReceivables
            blockTimestamp
          }
          monoCoolerGlobalStates(first: 1) {
            totalDebt
            totalCollateral
            interestRateWad
          }
        }
      `;

      const response = await fetch(COOLER_SUBGRAPH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error("Failed to fetch cooler metrics");

      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0]?.message || "Cooler subgraph error");

      // Legacy clearinghouse: get latest snapshot per clearinghouse (3 total: v1.0, v1.1, v1.2)
      // Values are BigDecimal (already human-readable, no /1e18)
      const snapshots = data?.clearinghouseSnapshots ?? [];
      const latestPerClearinghouse = new Map<string, { principal: number; interest: number }>();
      for (const snap of snapshots) {
        const chId = snap.clearinghouse?.id;
        if (chId && !latestPerClearinghouse.has(chId)) {
          latestPerClearinghouse.set(chId, {
            principal: parseFloat(snap.principalReceivables) || 0,
            interest: parseFloat(snap.interestReceivables) || 0,
          });
        }
      }

      let v1Principal = 0;
      let v1Interest = 0;
      for (const { principal, interest } of latestPerClearinghouse.values()) {
        v1Principal += principal;
        v1Interest += interest;
      }

      // MonoCooler: values are BigInt WAD format (need /1e18)
      // Matches cooler-metrics parseBigDecimal pattern
      const monoState = data?.monoCoolerGlobalStates?.[0];
      const monoDebt = monoState ? parseFloat(monoState.totalDebt) / 1e18 : 0;
      const monoCollateralGohm = monoState ? parseFloat(monoState.totalCollateral) / 1e18 : 0;
      // interestRateWad is annual rate in WAD: divide by 1e18, multiply by 100 for percent
      const interestRate = monoState?.interestRateWad
        ? (parseFloat(monoState.interestRateWad) / 1e18) * 100
        : 0.5;

      // Combine v1 + MonoCooler
      const totalBorrowed = v1Principal + monoDebt;

      return {
        totalBorrowed,
        totalCollateralGohm: monoCollateralGohm,
        v1Principal,
        v1Interest,
        monoDebt,
        interestRate,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
