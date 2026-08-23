import { useQuery } from "@tanstack/react-query";
import { getEmissionManagerPulse } from "@/generated/indexer";

export interface EmissionManagerState {
  isActive: boolean;
  isEnabled: boolean;
  baseEmissionRate: number;
  minimumPremium: number;
  backing: number;
  triggerPrice: number;
  beatCounter: number;
  activeMarketId: string;
  vestingPeriod: number;
  restartTimeframe: number;
  shutdownTimestamp: number;
  lastUpdated: number;
}

export interface BackingUpdate {
  timestamp: number;
  newBacking: number;
  supplyAdded: number;
  reservesAdded: number;
}

export interface EmissionManagerData {
  state: EmissionManagerState;
  recentBackingUpdates: BackingUpdate[];
  totalSupplyEmitted: number;
  totalReservesAdded: number;
  lastActivation: number | null;
  lastDeactivation: number | null;
}

export function useEmissionManager() {
  return useQuery<EmissionManagerData>({
    queryKey: ["emissionManager"],
    queryFn: async () => {
      // One request. The subgraph version issued four roots — contract state,
      // latest activation, latest deactivation, and the last 20 backing
      // updates — and this route exists to return exactly that set.
      const {
        data: { state: cs, activation, deactivation, backingUpdates },
      } = await getEmissionManagerPulse();

      if (!cs) throw new Error("No contract state found");

      const backing = Number.parseFloat(cs.backingDecimal) || 0;
      const minimumPremium = Number.parseFloat(cs.minimumPremiumDecimal) || 0;
      const state: EmissionManagerState = {
        isActive: cs.isActive,
        isEnabled: cs.isEnabled,
        baseEmissionRate: Number.parseFloat(cs.baseEmissionRateDecimal) || 0,
        minimumPremium,
        backing,
        triggerPrice: backing * (1 + minimumPremium),
        beatCounter: cs.beatCounter,
        activeMarketId: cs.activeMarketId,
        // Both are BigInt on the wire, i.e. strings — the hand-written type
        // called them numbers and the cast hid it. Converted here so the
        // exported shape stays numeric for the UI.
        vestingPeriod: Number(cs.vestingPeriod),
        restartTimeframe: Number(cs.restartTimeframe),
        shutdownTimestamp: Number(cs.shutdownTimestamp),
        lastUpdated: Number(cs.blockTimestamp),
      };

      const recentBackingUpdates: BackingUpdate[] = backingUpdates.map((u) => ({
        timestamp: Number(u.blockTimestamp),
        newBacking: Number.parseFloat(u.newBackingDecimal) || 0,
        supplyAdded: Number.parseFloat(u.supplyAddedDecimal) || 0,
        reservesAdded: Number.parseFloat(u.reservesAddedDecimal) || 0,
      }));

      const totalSupplyEmitted = recentBackingUpdates.reduce((sum, u) => sum + u.supplyAdded, 0);
      const totalReservesAdded = recentBackingUpdates.reduce((sum, u) => sum + u.reservesAdded, 0);

      return {
        state,
        recentBackingUpdates,
        totalSupplyEmitted,
        totalReservesAdded,
        lastActivation: activation ? Number(activation.blockTimestamp) : null,
        lastDeactivation: deactivation ? Number(deactivation.blockTimestamp) : null,
      };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
