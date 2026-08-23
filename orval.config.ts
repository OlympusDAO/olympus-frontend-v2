import { defineConfig } from "orval";
import { config } from "dotenv";
import { DEFAULT_INDEXER_API } from "./src/lib/indexer/api-url";

config();

const API_URL =
  process.env.OLYMPUS_API_URL ?? "https://dev-olympus-api.callisto.finance/openapi.json";

// The consolidated protocol indexer: RBS, bonds, cooler, governance, YRF,
// emissions and convertible deposits. Public and unauthenticated, so it has its
// own http client rather than the auth-injecting one.
const INDEXER_API_URL =
  process.env.PROTOCOL_INDEXER_API_URL ?? "https://api-production-ca6c.up.railway.app/openapi.json";

export default defineConfig({
  olympusUnits: {
    input: {
      target: API_URL,
    },
    output: {
      target: "src/generated/olympusUnits.ts",
      client: "react-query",
      clean: true,
      override: {
        mutator: {
          path: "src/api/customHttpClient.ts",
          name: "customHttpClient",
        },
        useTypeOverInterfaces: true,
        query: {
          useQuery: true,
          useMutation: true,
          useInfinite: false,
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
    // hooks: {
    //   afterAllFilesWrite: "biome check --write",
    // },
  },
  protocolIndexer: {
    input: {
      target: INDEXER_API_URL,
    },
    output: {
      target: "src/generated/indexer.ts",
      // `fetch`, not `react-query`: the hooks in this repo wrap these calls in
      // their own useQuery with their own keys, staleTime and refetch cadence,
      // so orval's generated hooks, query keys and options builders were 8k
      // lines of committed code nothing imported.
      client: "fetch",
      // NOT `clean`: both targets write into src/generated, and cleaning the
      // folder deletes the other target's output.
      clean: false,
      override: {
        mutator: {
          path: "src/api/indexerHttpClient.ts",
          name: "indexerHttpClient",
        },
        useTypeOverInterfaces: true,
        // Matches the olympusUnits target: the mutator returns the parsed body,
        // not orval's { data, status, headers } wrapper.
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
