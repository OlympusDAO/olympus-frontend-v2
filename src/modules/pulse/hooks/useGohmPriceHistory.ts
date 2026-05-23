import { useQuery } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { envioGraphqlClient } from "@/lib/graphql-client";
import type { GlobalMetricSnapshotRaw } from "@/lib/types/envio";
import { parseEnvioNumber } from "@/lib/utils/envio";

export interface GohmPriceHistory {
  dataPoints: Array<{ date: string; price: number }>;
}

const GOHM_PRICE_HISTORY_QUERY = gql`
  query GohmPriceHistory($start: String!) {
    GlobalMetricSnapshot(
      where: { date: { _gte: $start } }
      order_by: { date: asc }
      limit: 5000
    ) {
      date
      gOhmPrice
    }
  }
`;

type Row = Pick<GlobalMetricSnapshotRaw, "date" | "gOhmPrice">;

export function useGohmPriceHistory() {
  return useQuery<GohmPriceHistory>({
    queryKey: ["gohmPriceHistory", "envio"],
    queryFn: async ({ signal }) => {
      const start = new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];
      const { GlobalMetricSnapshot } = await envioGraphqlClient.request<{
        GlobalMetricSnapshot: Row[];
      }>({ document: GOHM_PRICE_HISTORY_QUERY, variables: { start }, signal });

      const dataPoints = GlobalMetricSnapshot.map((r) => ({
        date: r.date,
        price: parseEnvioNumber(r.gOhmPrice),
      })).filter((p) => p.price > 0);

      return { dataPoints };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
