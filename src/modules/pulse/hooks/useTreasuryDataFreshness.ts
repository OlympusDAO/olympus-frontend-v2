import { useQuery } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { envioGraphqlClient } from "@/lib/graphql-client";

export interface LaggingChain {
  chain: string;
  date: string;
  daysBehind: number;
}

const MS_PER_DAY = 86_400_000;

const LATEST_PER_CHAIN_QUERY = gql`
  query LatestPerChain {
    TokenRecord(
      distinct_on: [blockchain]
      order_by: [{ blockchain: asc }, { date: desc }, { block: desc }]
    ) {
      blockchain
      date
    }
  }
`;

type Row = { blockchain: string; date: string };

export function useTreasuryDataFreshness() {
  return useQuery<LaggingChain[]>({
    queryKey: ["treasuryDataFreshness", "envio"],
    queryFn: async ({ signal }) => {
      const { TokenRecord } = await envioGraphqlClient.request<{ TokenRecord: Row[] }>(
        LATEST_PER_CHAIN_QUERY,
        undefined,
        { signal } as RequestInit,
      );

      let latestDate = "";
      for (const r of TokenRecord) {
        if (r.date > latestDate) latestDate = r.date;
      }

      const latestMs = latestDate ? Date.parse(latestDate) : 0;
      const lagging: LaggingChain[] = [];
      for (const r of TokenRecord) {
        if (r.date === latestDate) continue;
        const daysBehind = Math.round((latestMs - Date.parse(r.date)) / MS_PER_DAY);
        lagging.push({ chain: r.blockchain, date: r.date, daysBehind });
      }
      lagging.sort((a, b) => b.daysBehind - a.daysBehind);

      return lagging;
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
