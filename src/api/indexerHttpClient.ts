import { DEFAULT_INDEXER_API } from "@/lib/indexer/api-url";

// Transport for the generated protocol-indexer client (src/generated/indexer.ts).
//
// Deliberately NOT customHttpClient: that one targets the Olympus Units API and
// injects a per-address `Authorization: Bearer` from localStorage. The indexer
// is a different host and is public and unauthenticated, so reusing it would
// send auth tokens somewhere they do not belong.
//
// Two things the generated code does not know about the API:
//   * failures answer `{ error: { code, message } }`, and the code is worth
//     surfacing — a 400 is a bug in the caller's parameters, a 502 is the
//     indexer being unreachable, and they want different handling;
//   * numerics cross the wire as strings, because the indexer stores
//     uint256-derived values that do not survive a JSON number.

export const indexerBaseUrl = (
  import.meta.env.VITE_PROTOCOL_INDEXER_API?.trim() || DEFAULT_INDEXER_API
).replace(/\/+$/, "");

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

export const indexerHttpClient = async <T>(url: string, options?: RequestInit): Promise<T> => {
  // Built through Headers rather than object spread: `options.headers` is a
  // RequestInit, so it may be a Headers instance or an array of tuples, and
  // spreading either of those yields {} — silently dropping every header the
  // caller set.
  const headers = new Headers(options?.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");

  const response = await fetch(`${indexerBaseUrl}${url}`, { ...options, headers });

  if (!response.ok) {
    let code = "http_error";
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body; the status line is all we have.
    }
    throw new IndexerError(response.status, code, message);
  }

  return (await response.json()) as T;
};

export default indexerHttpClient;
