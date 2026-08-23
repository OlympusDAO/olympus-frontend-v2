// Client for the Olympus protocol indexer REST API.
//
// Replaces the per-domain Graph gateway endpoints (cooler, governor, YRF,
// bonds, emission manager) and the convertible-deposits Ponder endpoint with
// one purpose-built API. Every route here exists because this frontend needed
// it — the route table was derived from an audit of these hooks — so a hook
// generally maps to exactly one request rather than a query it has to assemble.
//
// Two properties worth knowing before using it:
//
//   * Every response is `{ data, meta: { block } }`. `meta.block` is the block
//     the indexer has processed up to, so a caller can measure staleness
//     instead of assuming freshness. `fetchIndexer` returns the envelope;
//     `fetchIndexerData` unwraps it for the common case.
//   * Numeric values arrive as STRINGS. The indexer stores uint256-derived
//     values that do not survive a JSON number, so the API stringifies them.
//     Parse with `toNumber` when a float is genuinely wanted for display, and
//     leave them as strings anywhere precision matters.

const DEFAULT_BASE_URL = "https://api-production-ca6c.up.railway.app";

export const indexerBaseUrl = (
  import.meta.env.VITE_PROTOCOL_INDEXER_API?.trim() || DEFAULT_BASE_URL
).replace(/\/+$/, "");

export type IndexerMeta = { block: number };
export type IndexerResponse<T> = { data: T; meta: IndexerMeta };

export class IndexerError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "IndexerError";
    this.status = status;
    this.code = code;
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${indexerBaseUrl}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    // Undefined means "not supplied" — the API rejects unknown parameters and
    // applies its own defaults, so omitting is meaningfully different from
    // sending an empty string.
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function fetchIndexer<T>(
  path: string,
  params?: QueryParams,
  init?: RequestInit,
): Promise<IndexerResponse<T>> {
  const response = await fetch(buildUrl(path, params), {
    ...init,
    headers: { accept: "application/json", ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    // The API answers `{ error: { code, message } }` on every failure path, so
    // the code is worth surfacing — a 400 is a bug in the caller's parameters,
    // a 502 is the indexer being unreachable, and they want different handling.
    let code = "http_error";
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body; the status line above is all we have.
    }
    throw new IndexerError(response.status, code, message);
  }

  return (await response.json()) as IndexerResponse<T>;
}

export async function fetchIndexerData<T>(
  path: string,
  params?: QueryParams,
  init?: RequestInit,
): Promise<T> {
  return (await fetchIndexer<T>(path, params, init)).data;
}

// Numerics cross the wire as strings. This is for display and charting, where
// a float is what is wanted; never round-trip a value through it before
// sending it back on-chain.
export function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
