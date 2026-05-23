import { useQuery } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { envioGraphqlClient } from "@/lib/graphql-client";
import type { GlobalMetricSnapshotRaw } from "@/lib/types/envio";
import { parseEnvioNumber } from "@/lib/utils/envio";

export interface BackingHistory {
  dataPoints: Array<{ date: string; backing: number; ohmPrice: number }>;
}

const BACKING_HISTORY_QUERY = gql`
  query BackingHistory($start: String!) {
    GlobalMetricSnapshot(
      where: { date: { _gte: $start }, crossChainComplete: { _eq: true } }
      order_by: { date: asc }
      limit: 5000
    ) {
      date
      treasuryLiquidBackingPerOhmBacked
      ohmPrice
    }
  }
`;

type Row = Pick<GlobalMetricSnapshotRaw, "date" | "treasuryLiquidBackingPerOhmBacked" | "ohmPrice">;

export function useBackingHistory(days = 90) {
  return useQuery<BackingHistory>({
    queryKey: ["backingHistory", "envio", days],
    queryFn: async ({ signal }) => {
      const start = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];

      const { GlobalMetricSnapshot } = await envioGraphqlClient.request<{
        GlobalMetricSnapshot: Row[];
      }>(BACKING_HISTORY_QUERY, { start }, { signal } as RequestInit);

      const dataPoints = GlobalMetricSnapshot.map((r) => ({
        date: r.date,
        backing: parseEnvioNumber(r.treasuryLiquidBackingPerOhmBacked),
        ohmPrice: parseEnvioNumber(r.ohmPrice),
      })).filter((p) => p.backing > 0);

      return { dataPoints };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
