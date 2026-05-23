import { gql } from "graphql-request";
import { envioGraphqlClient } from "@/lib/graphql-client";
import type { GlobalMetricSnapshotRaw, TokenRecordRaw } from "@/lib/types/envio";

// Hasura's `numeric` scalar serializes as a string with up to ~50 digits of
// precision. `parseEnvioNumber` coerces to JS f64. Truncation past ~15
// significant digits is acceptable for the dashboards that consume these.
export function parseEnvioNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// Hasura enforces a hard 1000-row cap per query on this deployment.
// TokenRecord windows over many days easily exceed that; this helper
// paginates by offset until the page is short or the safety cap is hit.
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

const TOKEN_RECORDS_PAGE_QUERY = gql`
  query TokenRecordsPage($where: TokenRecord_bool_exp!, $offset: Int!, $limit: Int!) {
    TokenRecord(
      where: $where
      order_by: [{ date: desc }, { block: desc }, { id: asc }]
      limit: $limit
      offset: $offset
    ) {
      id
      date
      chainId
      blockchain
      block
      timestamp
      token
      tokenAddress
      source
      sourceAddress
      category
      isLiquid
      isBluechip
      balance
      rate
      multiplier
      value
      valueExcludingOhm
    }
  }
`;

// Envio emits 3 snapshots per day (~8h cadence) per chain. The legacy
// treasury-subgraph emitted one, so downstream aggregation that simply sums
// all rows for "today's date" over-counts 3×. Filter raw records to only the
// rows at the highest block within the latest date per chain.
export function filterLatestSnapshotPerChain(records: TokenRecordRaw[]): TokenRecordRaw[] {
  // First pass: latest (date, block) per chain.
  const keyByChain = new Map<string, { date: string; block: bigint }>();
  for (const r of records) {
    const chain = r.blockchain || "Unknown";
    const block = BigInt(r.block);
    const cur = keyByChain.get(chain);
    if (!cur || r.date > cur.date || (r.date === cur.date && block > cur.block)) {
      keyByChain.set(chain, { date: r.date, block });
    }
  }
  // Second pass: keep only rows matching the locked (date, block) per chain.
  return records.filter((r) => {
    const key = keyByChain.get(r.blockchain || "Unknown");
    return !!key && r.date === key.date && BigInt(r.block) === key.block;
  });
}

export async function fetchTokenRecords(
  where: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<TokenRecordRaw[]> {
  const out: TokenRecordRaw[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { TokenRecord } = await envioGraphqlClient.request<{ TokenRecord: TokenRecordRaw[] }>(
      TOKEN_RECORDS_PAGE_QUERY,
      { where, offset: page * PAGE_SIZE, limit: PAGE_SIZE },
      { signal } as RequestInit,
    );
    out.push(...TokenRecord);
    if (TokenRecord.length < PAGE_SIZE) return out;
  }
  return out;
}

export interface MetricRow {
  date: string;
  crossChainComplete: boolean;
  chainsIndexed: number[];
  chainsMissing: number[];
  ohmTotalSupply: number;
  ohmCirculatingSupply: number;
  ohmFloatingSupply: number;
  ohmBackedSupply: number;
  gOhmBackedSupply: number;
  ohmPrice: number;
  gOhmPrice: number;
  marketCap: number;
  ohmApy: number;
  treasuryMarketValue: number;
  treasuryLiquidBacking: number;
  treasuryLiquidBackingPerOhmFloating: number;
  treasuryLiquidBackingPerOhmBacked: number;
  treasuryLiquidBackingPerGOhmBacked: number;
  sOhmCirculatingSupply: number;
  sOhmTotalValueLocked: number;
}

export function mapEnvioMetric(raw: GlobalMetricSnapshotRaw): MetricRow {
  return {
    date: raw.date,
    crossChainComplete: raw.crossChainComplete,
    chainsIndexed: raw.chainsIndexed,
    chainsMissing: raw.chainsMissing,
    ohmTotalSupply: parseEnvioNumber(raw.ohmTotalSupply),
    ohmCirculatingSupply: parseEnvioNumber(raw.ohmCirculatingSupply),
    ohmFloatingSupply: parseEnvioNumber(raw.ohmFloatingSupply),
    ohmBackedSupply: parseEnvioNumber(raw.ohmBackedSupply),
    gOhmBackedSupply: parseEnvioNumber(raw.gOhmBackedSupply),
    ohmPrice: parseEnvioNumber(raw.ohmPrice),
    gOhmPrice: parseEnvioNumber(raw.gOhmPrice),
    marketCap: parseEnvioNumber(raw.marketCap),
    ohmApy: parseEnvioNumber(raw.ohmApy),
    treasuryMarketValue: parseEnvioNumber(raw.treasuryMarketValue),
    treasuryLiquidBacking: parseEnvioNumber(raw.treasuryLiquidBacking),
    treasuryLiquidBackingPerOhmFloating: parseEnvioNumber(raw.treasuryLiquidBackingPerOhmFloating),
    treasuryLiquidBackingPerOhmBacked: parseEnvioNumber(raw.treasuryLiquidBackingPerOhmBacked),
    treasuryLiquidBackingPerGOhmBacked: parseEnvioNumber(raw.treasuryLiquidBackingPerGOhmBacked),
    sOhmCirculatingSupply: parseEnvioNumber(raw.sOhmCirculatingSupply),
    sOhmTotalValueLocked: parseEnvioNumber(raw.sOhmTotalValueLocked),
  };
}
