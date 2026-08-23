/**
 * Drains a cursor-paginated indexer route.
 *
 * Every list route takes `sinceId` and can be ordered by id, and id-ordering is
 * what makes the cursor stable — ordering by timestamp would repeat or skip
 * rows that share one. The caller passes a closure over a generated fetcher
 * rather than a path, so the route's own parameter type still checks the
 * `orderBy`/filter arguments it supplies.
 */
export const PAGE_SIZE = 1000;

export async function fetchAllPages<T extends { id: string }>(
  page: (cursor: { sinceId?: string; limit: number }) => Promise<{ data: T[] }>,
): Promise<T[]> {
  const all: T[] = [];
  let sinceId: string | undefined;
  for (;;) {
    const { data } = await page({ sinceId, limit: PAGE_SIZE });
    all.push(...data);
    if (data.length < PAGE_SIZE) return all;
    sinceId = data[data.length - 1].id;
  }
}
