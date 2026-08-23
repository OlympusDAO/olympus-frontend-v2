/**
 * Row helpers shared by the indexer-backed hooks.
 *
 * Entity timestamps cross the wire as strings — they are BigInt in the indexer
 * schema — while the UI types them as numbers. Converting in one place keeps
 * the per-hook copies of this map from drifting.
 */
export type Timestamped = { timestamp: string };

export type WithNumericTimestamp<T extends Timestamped> = Omit<T, "timestamp"> & {
  timestamp: number;
};

export function withNumericTimestamp<T extends Timestamped>(row: T): WithNumericTimestamp<T> {
  return { ...row, timestamp: Number(row.timestamp) };
}

/**
 * Drains a windowed list route and converts its timestamps.
 *
 * Takes a closure over a generated fetcher rather than a path and a param bag,
 * so each route's own parameter type still checks the window it is given.
 */
export async function windowed<T extends Timestamped>(
  fetchRows: () => Promise<{ data: T[] }>,
): Promise<WithNumericTimestamp<T>[]> {
  const { data } = await fetchRows();
  return data.map(withNumericTimestamp);
}
