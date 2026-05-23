import { useQuery } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { envioGraphqlClient } from "@/lib/graphql-client";
import type { GlobalMetricSnapshotRaw } from "@/lib/types/envio";
import { parseEnvioNumber } from "@/lib/utils/envio";

interface TreasuryMetrics {
  ohmTotalSupply: number;
  ohmCirculatingSupply: number;
  ohmBackedSupply: number;
  treasuryMarketValue: number;
  treasuryLiquidBacking: number;
  treasuryLiquidBackingPerOhmBacked: number;
  ohmPrice: number;
}

const LATEST_METRICS_QUERY = gql`
  query LatestTreasuryMetrics {
    GlobalMetricSnapshot(
      where: { crossChainComplete: { _eq: true } }
      order_by: { date: desc }
      limit: 1
    ) {
      ohmTotalSupply
      ohmCirculatingSupply
      ohmBackedSupply
      treasuryMarketValue
      treasuryLiquidBacking
      treasuryLiquidBackingPerOhmBacked
      ohmPrice
    }
  }
`;

type Row = Pick<
  GlobalMetricSnapshotRaw,
  | "ohmTotalSupply"
  | "ohmCirculatingSupply"
  | "ohmBackedSupply"
  | "treasuryMarketValue"
  | "treasuryLiquidBacking"
  | "treasuryLiquidBackingPerOhmBacked"
  | "ohmPrice"
>;

const EMPTY: TreasuryMetrics = {
  ohmTotalSupply: 0,
  ohmCirculatingSupply: 0,
  ohmBackedSupply: 0,
  treasuryMarketValue: 0,
  treasuryLiquidBacking: 0,
  treasuryLiquidBackingPerOhmBacked: 0,
  ohmPrice: 0,
};

export function useTreasuryMetrics() {
  return useQuery<TreasuryMetrics>({
    queryKey: ["treasuryMetrics", "envio"],
    queryFn: async ({ signal }) => {
      const { GlobalMetricSnapshot } = await envioGraphqlClient.request<{
        GlobalMetricSnapshot: Row[];
      }>(LATEST_METRICS_QUERY, undefined, { signal } as RequestInit);

      const row = GlobalMetricSnapshot[0];
      if (!row) return EMPTY;

      return {
        ohmTotalSupply: parseEnvioNumber(row.ohmTotalSupply),
        ohmCirculatingSupply: parseEnvioNumber(row.ohmCirculatingSupply),
        ohmBackedSupply: parseEnvioNumber(row.ohmBackedSupply),
        treasuryMarketValue: parseEnvioNumber(row.treasuryMarketValue),
        treasuryLiquidBacking: parseEnvioNumber(row.treasuryLiquidBacking),
        treasuryLiquidBackingPerOhmBacked: parseEnvioNumber(row.treasuryLiquidBackingPerOhmBacked),
        ohmPrice: parseEnvioNumber(row.ohmPrice),
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
