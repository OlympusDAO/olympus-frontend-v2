import { useQuery } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { envioGraphqlClient } from "@/lib/graphql-client";
import type { GlobalMetricSnapshotRaw } from "@/lib/types/envio";
import { parseEnvioNumber } from "@/lib/utils/envio";

export interface TreasuryHistoryPoint {
  date: string;
  totalBackingPerOhm: number;
  liquidBackingPerOhm: number;
  ohmPrice: number;
  backedSupply: number;
}

const MAX_CHART_POINTS = 180;

function downsample(points: TreasuryHistoryPoint[], maxPoints = MAX_CHART_POINTS) {
  if (points.length <= maxPoints) return points;

  const sampled: TreasuryHistoryPoint[] = [];
  const lastIndex = points.length - 1;

  for (let i = 0; i < maxPoints; i++) {
    const sourceIndex = Math.round((i / (maxPoints - 1)) * lastIndex);
    sampled.push(points[sourceIndex]);
  }

  return sampled;
}

const TREASURY_HISTORY_QUERY = gql`
  query TreasuryHistory($start: String!) {
    GlobalMetricSnapshot(
      where: { date: { _gte: $start }, crossChainComplete: { _eq: true } }
      order_by: { date: asc }
      limit: 5000
    ) {
      date
      ohmBackedSupply
      ohmPrice
      treasuryLiquidBacking
      treasuryLiquidBackingPerOhmBacked
      treasuryMarketValue
    }
  }
`;

type Row = Pick<
  GlobalMetricSnapshotRaw,
  | "date"
  | "ohmBackedSupply"
  | "ohmPrice"
  | "treasuryLiquidBacking"
  | "treasuryLiquidBackingPerOhmBacked"
  | "treasuryMarketValue"
>;

export function useTreasuryHistory(days = 7) {
  return useQuery<TreasuryHistoryPoint[]>({
    queryKey: ["treasuryHistory", "envio", days],
    queryFn: async ({ signal }) => {
      const start = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];

      const { GlobalMetricSnapshot } = await envioGraphqlClient.request<{
        GlobalMetricSnapshot: Row[];
      }>({ document: TREASURY_HISTORY_QUERY, variables: { start }, signal });

      const points = GlobalMetricSnapshot.map((r) => {
        const backedSupply = parseEnvioNumber(r.ohmBackedSupply);
        const treasuryMarketValue = parseEnvioNumber(r.treasuryMarketValue);
        const totalBackingPerOhm = backedSupply > 0 ? treasuryMarketValue / backedSupply : 0;
        return {
          date: r.date,
          totalBackingPerOhm,
          liquidBackingPerOhm: parseEnvioNumber(r.treasuryLiquidBackingPerOhmBacked),
          ohmPrice: parseEnvioNumber(r.ohmPrice),
          backedSupply,
        };
      });

      return downsample(points);
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
