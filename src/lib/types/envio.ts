// Raw entity shapes returned by the Envio Hasura indexer.
// Numeric fields are Hasura `numeric` scalars and arrive as strings; convert
// at the hook boundary via `parseEnvioNumber` in `src/lib/utils/envio.ts`.

export interface GlobalMetricSnapshotRaw {
  id: string;
  date: string;
  crossChainComplete: boolean;
  chainsIndexed: number[];
  chainsMissing: number[];
  ohmTotalSupply: string;
  ohmCirculatingSupply: string;
  ohmFloatingSupply: string;
  ohmBackedSupply: string;
  gOhmBackedSupply: string;
  ohmPrice: string;
  gOhmPrice: string;
  marketCap: string;
  ohmApy: string;
  treasuryMarketValue: string;
  treasuryLiquidBacking: string;
  treasuryLiquidBackingPerOhmFloating: string;
  treasuryLiquidBackingPerOhmBacked: string;
  treasuryLiquidBackingPerGOhmBacked: string;
  sOhmCirculatingSupply: string;
  sOhmTotalValueLocked: string;
}

export interface TokenRecordRaw {
  id: string;
  date: string;
  chainId: number;
  blockchain: string;
  block: string;
  timestamp: string;
  token: string;
  tokenAddress: string;
  source: string;
  sourceAddress: string;
  category: string;
  isLiquid: boolean;
  isBluechip: boolean;
  balance: string;
  rate: string;
  multiplier: string;
  value: string;
  valueExcludingOhm: string;
}
