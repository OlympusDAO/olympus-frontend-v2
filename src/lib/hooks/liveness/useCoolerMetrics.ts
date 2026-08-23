import { useQuery } from "@tanstack/react-query";
import { getCoolerLiveness } from "@/generated/indexer";

interface CoolerMetrics {
  totalBorrowed: number;
  totalCollateralGohm: number;
  v1Principal: number;
  v1Interest: number;
  monoDebt: number;
  interestRate: number;
}

// Fallback annual rate, used only when MonoCooler has no state yet.
const DEFAULT_INTEREST_RATE = 0.5;

export function useCoolerMetrics() {
  return useQuery<CoolerMetrics>({
    queryKey: ["coolerMetrics"],
    queryFn: async () => {
      // One request. The route exists for this poll: the latest clearinghouse
      // snapshots and MonoCooler global state together, rather than a
      // hand-assembled document fetching both and de-duplicating client-side.
      const {
        data: { snapshots, monocooler },
      } = await getCoolerLiveness();

      // Newest first, so the first snapshot seen per clearinghouse is its
      // latest. v1 values are already human-readable decimals — no 1e18 here.
      const latestPerClearinghouse = new Map<string, { principal: number; interest: number }>();
      for (const snapshot of snapshots) {
        const id = snapshot.clearinghouse?.id;
        if (id && !latestPerClearinghouse.has(id)) {
          latestPerClearinghouse.set(id, {
            principal: Number.parseFloat(snapshot.principalReceivables) || 0,
            interest: Number.parseFloat(snapshot.interestReceivables) || 0,
          });
        }
      }

      let v1Principal = 0;
      let v1Interest = 0;
      for (const { principal, interest } of latestPerClearinghouse.values()) {
        v1Principal += principal;
        v1Interest += interest;
      }

      // MonoCooler values are WAD (1e18), unlike the v1 snapshots above.
      const monoDebt = monocooler ? Number.parseFloat(monocooler.totalDebt) / 1e18 : 0;
      const monoCollateralGohm = monocooler
        ? Number.parseFloat(monocooler.totalCollateral) / 1e18
        : 0;
      const interestRate = monocooler?.interestRateWad
        ? (Number.parseFloat(monocooler.interestRateWad) / 1e18) * 100
        : DEFAULT_INTEREST_RATE;

      return {
        totalBorrowed: v1Principal + monoDebt,
        totalCollateralGohm: monoCollateralGohm,
        v1Principal,
        v1Interest,
        monoDebt,
        interestRate,
      };
    },
    staleTime: 60_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
