// Minimal REST client for the Olympus treasury metrics API.
// Mirrors the v3 `@olympusdao/treasury-subgraph-client` interface for the
// helpers we actually use; swap to the npm package once v3 is published.

import type { ApiResponse, BoundsResponse, DailyMetric, OhmSupply, TreasuryAsset } from "./types";

const DEFAULT_BASE_URL = "https://treasury-subgraph-api.olympusdao.finance";
const DAY_MS = 86_400_000;

type DailyRangeInput = {
  start: string;
  end?: string;
  signal?: AbortSignal;
};

type DailyMetricsInput = DailyRangeInput & {
  includeRecords?: boolean;
};

export class TreasurySubgraphClient {
  private readonly baseUrl: string;
  private boundsPromise: Promise<BoundsResponse> | undefined;

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async getBounds(signal?: AbortSignal): Promise<BoundsResponse> {
    return this.fetchData<BoundsResponse>(this.url("/v2/bounds"), signal);
  }

  /** Cached per-instance — `/v2/bounds` is identical for every caller in a session. */
  getCachedBounds(): Promise<BoundsResponse> {
    this.boundsPromise ??= this.getBounds();
    return this.boundsPromise;
  }

  async getDailyMetrics(
    input: DailyMetricsInput & { autoPaginate?: boolean },
  ): Promise<DailyMetric[]> {
    return this.dailyFetch<DailyMetric>("/v2/metrics/daily", input, (url) => {
      if (input.includeRecords !== undefined) {
        url.searchParams.set("includeRecords", String(input.includeRecords));
      }
    });
  }

  async getDailyTreasuryAssets(
    input: DailyRangeInput & { autoPaginate?: boolean },
  ): Promise<TreasuryAsset[]> {
    return this.dailyFetch<TreasuryAsset>("/v2/treasury-assets/daily", input);
  }

  async getDailyOhmSupply(
    input: DailyRangeInput & { autoPaginate?: boolean },
  ): Promise<OhmSupply[]> {
    return this.dailyFetch<OhmSupply>("/v2/ohm-supply/daily", input);
  }

  private async dailyFetch<T>(
    path: string,
    input: DailyRangeInput & { autoPaginate?: boolean },
    configureUrl?: (url: URL) => void,
  ): Promise<T[]> {
    if (input.autoPaginate) {
      const bounds = await this.getCachedBounds();
      const chunks = splitRange({
        start: input.start,
        end: input.end ?? bounds.latestDate,
        maxDays: bounds.maxRangeDays,
      });
      const pages = await Promise.all(
        chunks.map((chunk) => {
          const url = this.url(path);
          appendRange(url, chunk);
          configureUrl?.(url);
          return this.fetchData<T[]>(url, input.signal);
        }),
      );
      return pages.flat();
    }
    const url = this.url(path);
    appendRange(url, input);
    configureUrl?.(url);
    return this.fetchData<T[]>(url, input.signal);
  }

  private url(path: string): URL {
    return new URL(path, `${this.baseUrl}/`);
  }

  private async fetchData<T>(url: URL, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url.toString(), { method: "GET", signal });
    if (!response.ok) {
      throw new Error(`Treasury API ${url.pathname} → HTTP ${response.status}`);
    }
    const body = (await response.json()) as ApiResponse<T>;
    return body.data;
  }
}

function appendRange(url: URL, input: { start: string; end?: string }): void {
  url.searchParams.set("start", input.start);
  if (input.end !== undefined) {
    url.searchParams.set("end", input.end);
  }
}

function splitRange(input: {
  start: string;
  end: string;
  maxDays: number;
}): Array<{ start: string; end: string }> {
  if (input.maxDays < 1) {
    throw new Error(`maxRangeDays must be ≥ 1, got ${input.maxDays}`);
  }
  const start = parseDate(input.start);
  const end = parseDate(input.end);
  if (end.getTime() < start.getTime()) {
    throw new Error("end must be ≥ start");
  }
  const chunks: Array<{ start: string; end: string }> = [];
  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    const chunkEnd = new Date(
      Math.min(end.getTime(), cursor.getTime() + (input.maxDays - 1) * DAY_MS),
    );
    chunks.push({ start: formatDate(cursor), end: formatDate(chunkEnd) });
    cursor = new Date(chunkEnd.getTime() + DAY_MS);
  }
  return chunks;
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date: ${value}`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Singleton instance — base URL can be overridden via `VITE_TREASURY_API_URL`. */
export const treasuryClient = new TreasurySubgraphClient(
  (import.meta.env.VITE_TREASURY_API_URL as string | undefined) ?? DEFAULT_BASE_URL,
);
