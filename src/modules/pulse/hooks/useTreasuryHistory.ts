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
  query TreasuryHistory($start: String!, $offset: Int!, $limit: Int!) {
    GlobalMetricSnapshot(
      where: { date: { _gte: $start }, crossChainComplete: { _eq: true } }
      order_by: { date: asc }
      limit: $limit
      offset: $offset
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

// Hasura caps single queries at 1000 rows. The "Max" window (1825 days) blows
// past that — without paginating, the recent end of the chart gets truncated.
const PAGE_SIZE = 1000;
const MAX_PAGES = 10;

export function useTreasuryHistory(days = 7) {
  return useQuery<TreasuryHistoryPoint[]>({
    queryKey: ["treasuryHistory", "envio", days],
    queryFn: async ({ signal }) => {
      const start = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];

      const rows: Row[] = [];
      for (let page = 0; page < MAX_PAGES; page++) {
        const { GlobalMetricSnapshot } = await envioGraphqlClient.request<{
          GlobalMetricSnapshot: Row[];
        }>({
          document: TREASURY_HISTORY_QUERY,
          variables: { start, offset: page * PAGE_SIZE, limit: PAGE_SIZE },
          signal,
        });
        rows.push(...GlobalMetricSnapshot);
        if (GlobalMetricSnapshot.length < PAGE_SIZE) break;
      }

      const points = rows.map((r) => {
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
