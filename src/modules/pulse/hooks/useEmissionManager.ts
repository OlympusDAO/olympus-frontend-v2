import { useQuery } from "@tanstack/react-query";
import { EMISSION_MANAGER_SUBGRAPH_URL } from "@/lib/constants";

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
      const query = `
        {
          contractStates(first: 1, orderBy: blockTimestamp, orderDirection: desc) {
            isActive
            isEnabled
            baseEmissionRateDecimal
            minimumPremiumDecimal
            backingDecimal
            beatCounter
            activeMarketId
            vestingPeriod
            restartTimeframe
            shutdownTimestamp
            blockTimestamp
          }
          activations(first: 1, orderBy: blockTimestamp, orderDirection: desc) {
            blockTimestamp
          }
          deactivations(first: 1, orderBy: blockTimestamp, orderDirection: desc) {
            blockTimestamp
          }
          backingUpdates(first: 20, orderBy: blockTimestamp, orderDirection: desc) {
            newBackingDecimal
            supplyAddedDecimal
            reservesAddedDecimal
            blockTimestamp
          }
        }
      `;

      const response = await fetch(EMISSION_MANAGER_SUBGRAPH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error("Failed to fetch emission manager data");
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0]?.message || "Emission manager query error");

      const cs = data.contractStates?.[0];
      if (!cs) throw new Error("No contract state found");
      const backing = parseFloat(cs.backingDecimal) || 0;
      const minimumPremium = parseFloat(cs.minimumPremiumDecimal) || 0;
      const state: EmissionManagerState = {
        isActive: cs.isActive,
        isEnabled: cs.isEnabled,
        baseEmissionRate: parseFloat(cs.baseEmissionRateDecimal) || 0,
        minimumPremium,
        backing,
        triggerPrice: backing * (1 + minimumPremium),
        beatCounter: cs.beatCounter,
        activeMarketId: cs.activeMarketId,
        vestingPeriod: cs.vestingPeriod,
        restartTimeframe: cs.restartTimeframe,
        shutdownTimestamp: Number(cs.shutdownTimestamp),
        lastUpdated: Number(cs.blockTimestamp),
      };

      const recentBackingUpdates: BackingUpdate[] = (data.backingUpdates ?? []).map(
        (u: {
          blockTimestamp: string;
          newBackingDecimal: string;
          supplyAddedDecimal: string;
          reservesAddedDecimal: string;
        }) => ({
          timestamp: Number(u.blockTimestamp),
          newBacking: parseFloat(u.newBackingDecimal) || 0,
          supplyAdded: parseFloat(u.supplyAddedDecimal) || 0,
          reservesAdded: parseFloat(u.reservesAddedDecimal) || 0,
        }),
      );

      const totalSupplyEmitted = recentBackingUpdates.reduce((sum, u) => sum + u.supplyAdded, 0);
      const totalReservesAdded = recentBackingUpdates.reduce((sum, u) => sum + u.reservesAdded, 0);

      const lastActivation = data.activations?.[0]
        ? Number(data.activations[0].blockTimestamp)
        : null;
      const lastDeactivation = data.deactivations?.[0]
        ? Number(data.deactivations[0].blockTimestamp)
        : null;

      return {
        state,
        recentBackingUpdates,
        totalSupplyEmitted,
        totalReservesAdded,
        lastActivation,
        lastDeactivation,
      };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
