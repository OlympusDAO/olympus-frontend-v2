import { useQuery } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { envioGraphqlClient } from "@/lib/graphql-client";
import type { GlobalMetricSnapshotRaw } from "@/lib/types/envio";
import { parseEnvioNumber } from "@/lib/utils/envio";

export interface OhmPriceHistory {
  dataPoints: Array<{ date: string; price: number }>;
}

const OHM_PRICE_HISTORY_QUERY = gql`
  query OhmPriceHistory($start: String!) {
    GlobalMetricSnapshot(
      where: { date: { _gte: $start } }
      order_by: { date: asc }
      limit: 5000
    ) {
      date
      ohmPrice
    }
  }
`;

type Row = Pick<GlobalMetricSnapshotRaw, "date" | "ohmPrice">;

export function useOhmPriceHistory(days = 30) {
  return useQuery<OhmPriceHistory>({
    queryKey: ["ohmPriceHistory", "envio", days],
    queryFn: async ({ signal }) => {
      const start = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];
      const { GlobalMetricSnapshot } = await envioGraphqlClient.request<{
        GlobalMetricSnapshot: Row[];
      }>({ document: OHM_PRICE_HISTORY_QUERY, variables: { start }, signal });

      const dataPoints = GlobalMetricSnapshot.map((r) => ({
        date: r.date,
        price: parseEnvioNumber(r.ohmPrice),
      })).filter((p) => p.price > 0);

      return { dataPoints };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
